import React, { useState, useEffect } from 'react';
import {
    Alert, Box, Button, FormHelperText, Grid, InputAdornment, MenuItem, Stack, Step, StepLabel, Stepper,
    TextField, Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
    Business as BusinessIcon, LocationOn as LocationOnIcon, ContactPhone as ContactPhoneIcon,
    CorporateFare as CorporateFareIcon, Phone as PhoneIcon, Print as PrintIcon,
    Email as EmailIcon, Badge as BadgeIcon, Save as SaveIcon, Close as CloseIcon,
    ArrowBack as ArrowBackIcon, ArrowForward as ArrowForwardIcon, AccountTree as AccountTreeIcon,
    FactCheck as FactCheckIcon,
} from '@mui/icons-material';
import { organisationService } from '../services';
import { AppDialog, SectionCard, LoadingButton, LoadingState, SelectableCard, InfoField } from './shared';

const steps = ['Ebenentyp & Art', 'Angaben', 'Prüfen & anlegen'];

const StepperBar = styled(Box)(({ theme }) => ({
    padding: theme.spacing(3, 3, 2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
}));

const emptyForm = {
    name: '', orgtypeId: '', levelTypeId: '', levelUuid: '', communityId: '',
    phone: '', fax: '', email: '', street: '', hnr: '', city: '', postcode: '',
};

const adornment = (icon) => ({
    input: { startAdornment: <InputAdornment position="start">{icon}</InputAdornment> },
});

// TODO: echte ID aus ua_level_type eintragen
const LT_HIO_VERBUND = 9;
const BF_ORGTYPE_ID = 1;

const isBf = (orgtypeId) => Number(orgtypeId) === BF_ORGTYPE_ID;
const isHio = (levelTypeId) => Number(levelTypeId) === LT_HIO_VERBUND;
// Ebene nur bei HIO-Verbund (alle Arten) und bei Gemeinde + BF
const showLevel = (levelTypeId, orgtypeId) => orgtypeId !== '' && (isHio(levelTypeId) || isBf(orgtypeId));
// Community bei allen außer BF, erst nach Wahl der Organisationsart
const showCommunity = (orgtypeId) => orgtypeId !== '' && !isBf(orgtypeId);

// TODO: echte IDs aus ua_level_type / ua_orgtype eintragen
const LT_GEMEINDE = 1;
const LT_KREISFREIE_STADT = 2;
const LT_KREIS = 5;
const VERWALTUNG_ORGTYPE_ID = 2;
const COMMUNITY_NAME_LEVEL_TYPES = [LT_GEMEINDE, LT_KREISFREIE_STADT, LT_KREIS];

// 'level': BF + Ebene, 'community': Organisationsart + Community, 'manual': Eingabe von Hand
const getNameMode = (levelTypeId, orgtypeId) => {
    if (orgtypeId === '') return 'manual';
    if (isBf(orgtypeId)) return 'level';
    if (Number(orgtypeId) === VERWALTUNG_ORGTYPE_ID
        && COMMUNITY_NAME_LEVEL_TYPES.includes(Number(levelTypeId))) return 'community';
    return 'manual';
};

/**
 * Dialog zum Anlegen (POST /organisations) und Bearbeiten (PUT /organisations/{orgUuid})
 * einer Organisation. Beim Bearbeiten unterstützt das Backend nur die Stammdatenfelder.
 */
const OrganisationForm = ({ open, onClose, onSuccess, editOrg = null }) => {
    const isEdit = Boolean(editOrg);
    const [form, setForm] = useState(emptyForm);
    const [orgTypes, setOrgTypes] = useState([]);
    const [levelTypes, setLevelTypes] = useState([]);
    const [levels, setLevels] = useState([]);
    const [communities, setCommunities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(false);
    const [error, setError] = useState(null);
    const [errors, setErrors] = useState({});
    const [activeStep, setActiveStep] = useState(0);
    const [orgTypesLoading, setOrgTypesLoading] = useState(false);

    useEffect(() => {
        if (!open) return;
        setError(null);
        setErrors({});
        setActiveStep(0);
        if (isEdit) {
            loadOrganisation();
        } else {
            setForm(emptyForm);
            setOrgTypes([]);
            setLevels([]);
            loadSelects();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const loadSelects = async () => {
        setDataLoading(true);
        try {
            const [lt, cm] = await Promise.all([
                organisationService.getLevelTypes(),
                organisationService.getCommunities(),
            ]);
            setLevelTypes(lt.options || []);
            setCommunities(cm.options || []);
        } catch {
            setError('Auswahllisten konnten nicht geladen werden.');
        } finally {
            setDataLoading(false);
        }
    };

    const loadOrganisation = async () => {
        setDataLoading(true);
        try {
            const org = await organisationService.getOrganisationById(editOrg.orgUuid);
            setForm({
                ...emptyForm,
                name: org.orgName || org.name || '',
                phone: org.phone || '',
                fax: org.fax || '',
                email: org.email || '',
                street: org.street || '',
                hnr: org.hnr || '',
                city: org.city || '',
                postcode: org.postcode || '',
            });
        } catch {
            setError('Organisationsdaten konnten nicht geladen werden.');
        } finally {
            setDataLoading(false);
        }
    };

    const handleLevelTypeChange = async (levelTypeId) => {
        setForm((prev) => ({ ...prev, levelTypeId, levelUuid: '', orgtypeId: '', communityId: '' }));
        setErrors((prev) => ({ ...prev, levelTypeId: undefined, orgtypeId: undefined, levelUuid: undefined, communityId: undefined }));
        setLevels([]);
        setOrgTypes([]);
        setOrgTypesLoading(true);
        try {
            const ot = await organisationService.getOrgTypes({ createLevelTypeId: Number(levelTypeId) });
            setOrgTypes(ot.options || []);
            setError(null);
        } catch {
            setError('Organisationsarten konnten nicht geladen werden.');
        } finally {
            setOrgTypesLoading(false);
        }
    };

    const handleOrgTypeChange = async (orgtypeId) => {
        setForm((prev) => ({
            ...prev,
            orgtypeId,
            levelUuid: '',
            communityId: isBf(orgtypeId) ? '' : prev.communityId,
        }));
        setErrors((prev) => ({ ...prev, orgtypeId: undefined, levelUuid: undefined, communityId: undefined }));
        setLevels([]);

        if (!showLevel(form.levelTypeId, orgtypeId)) return;

        const filter = { levelTypeId: Number(form.levelTypeId) };
        if (isBf(orgtypeId)) filter.createBf = true;

        try {
            const lv = await organisationService.getLevels(filter);
            setLevels(lv.options || []);
            setError(null);
        } catch {
            setError('Ebenen konnten nicht geladen werden.');
        }
    };

    const handleChange = (field) => (e) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

    const getStepErrors = (step) => {
        const e = {};
        if (step === 0 && !isEdit) {
            if (form.levelTypeId === '' || form.levelTypeId === null) e.levelTypeId = 'Ebenentyp ist erforderlich';
            if (form.orgtypeId === '' || form.orgtypeId === null) e.orgtypeId = 'Organisationsart ist erforderlich';
        }
        if (step === 1) {
            if (!isAutoName && !form.name?.trim()) e.name = 'Name ist erforderlich';
            if (!form.city?.trim()) e.city = 'Stadt ist erforderlich';
            if (!form.postcode?.trim()) e.postcode = 'PLZ ist erforderlich';
            if (!isEdit) {
                if (isBf(form.orgtypeId) && !form.levelUuid) e.levelUuid = 'Ebene ist erforderlich';
                if (showCommunity(form.orgtypeId) && (form.communityId === '' || form.communityId === null)) e.communityId = 'Community ist erforderlich';
            }
        }
        return e;
    };

    const validateStep = (step) => {
        const e = getStepErrors(step);
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleNext = () => {
        if (validateStep(activeStep)) setActiveStep((s) => s + 1);
    };

    const handleBack = () => {
        setErrors({});
        setActiveStep((s) => s - 1);
    };

    const handleSubmit = async () => {
        // Vor dem Absenden alle Schritte prüfen und ggf. zum ersten fehlerhaften springen
        const stepsToCheck = isEdit ? [1] : [0, 1];
        const invalidStep = stepsToCheck.find((s) => Object.keys(getStepErrors(s)).length > 0);
        if (invalidStep !== undefined) {
            if (!isEdit) setActiveStep(invalidStep);
            validateStep(invalidStep);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const baseData = {
                name: isAutoName ? baseName : form.name,
                phone: form.phone || '',
                fax: form.fax || '',
                email: form.email || '',
                street: form.street || '',
                hnr: form.hnr || '',
                city: form.city,
                postcode: form.postcode,
            };
            if (isEdit) {
                await organisationService.updateOrganisation(editOrg.orgUuid, baseData);
            } else {
                const payload = { ...baseData, orgtypeId: Number(form.orgtypeId), levelTypeId: Number(form.levelTypeId) };
                if (showLevel(form.levelTypeId, form.orgtypeId) && form.levelUuid) payload.levelUuid = form.levelUuid;
                if (showCommunity(form.orgtypeId)) payload.communityId = Number(form.communityId);
                await organisationService.createOrganisation(payload);
            }
            onSuccess();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Fehler beim Speichern der Organisation');
        } finally {
            setLoading(false);
        }
    };

    const selectedOrgType = orgTypes.find((o) => String(o.value) === String(form.orgtypeId));
    const namePrefix = !isEdit ? selectedOrgType?.prefix?.trim() || '' : '';
    const nameSuffix = !isEdit ? selectedOrgType?.suffix?.trim() || '' : '';
    const nameMode = isEdit ? 'manual' : getNameMode(form.levelTypeId, form.orgtypeId);
    const isAutoName = nameMode !== 'manual';
    const labelOf = (list, v) => list.find((o) => String(o.value) === String(v))?.label || '';
    const baseName =
        nameMode === 'level' ? labelOf(levels, form.levelUuid)
        : nameMode === 'community' ? labelOf(communities, form.communityId)
        : form.name.trim();
    // Präfix aus der API, sonst "BF" bzw. der Name der Organisationsart
    const displayPrefix =
        nameMode === 'level' ? (namePrefix || 'BF')
        : nameMode === 'community' ? (namePrefix || selectedOrgType?.label || '')
        : namePrefix;
    const fullNamePreview = [displayPrefix, baseName, nameSuffix].filter(Boolean).join(' ');

    const field = (name, label, extra = {}) => (
        <TextField
            label={label}
            value={form[name]}
            onChange={handleChange(name)}
            error={Boolean(errors[name])}
            helperText={errors[name]}
            {...extra}
        />
    );

    // ========== Schritt 1: Ebenentyp & Organisationsart ==========

    const renderTypeStep = () => (
        <Stack spacing={2.5}>
            <SectionCard icon={<AccountTreeIcon />} title="Ebenentyp" subtitle="Auf welcher Ebene wird die Organisation angelegt?">
                <TextField
                    select
                    required
                    label="Ebenentyp"
                    value={form.levelTypeId}
                    onChange={(e) => handleLevelTypeChange(e.target.value)}
                    error={Boolean(errors.levelTypeId)}
                    helperText={errors.levelTypeId}
                >
                    {levelTypes.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                </TextField>
            </SectionCard>

            <SectionCard icon={<CorporateFareIcon />} title="Organisationsart" subtitle="Gefiltert nach dem gewählten Ebenentyp">
                {form.levelTypeId === '' ? (
                    <Typography variant="body2" color="text.secondary">Bitte zuerst einen Ebenentyp wählen.</Typography>
                ) : orgTypesLoading ? (
                    <LoadingState />
                ) : orgTypes.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">Für diesen Ebenentyp sind keine Organisationsarten verfügbar.</Typography>
                ) : (
                    <Grid container spacing={1.5} role="radiogroup" aria-label="Organisationsart">
                        {orgTypes.map((o) => (
                            <Grid key={o.value} size={{ xs: 12, sm: 6, md: 4 }}>
                                <SelectableCard
                                    role="radio"
                                    selected={String(form.orgtypeId) === String(o.value)}
                                    onClick={() => handleOrgTypeChange(o.value)}
                                    label={o.prefix ? `${o.label} (${o.prefix})` : o.label}
                                />
                            </Grid>
                        ))}
                    </Grid>
                )}
                {errors.orgtypeId && <FormHelperText error sx={{ mt: 1 }}>{errors.orgtypeId}</FormHelperText>}
            </SectionCard>
        </Stack>
    );

    // ========== Schritt 2: Angaben ==========

    const renderDetailsStep = () => (
        <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, md: isEdit ? 12 : 6 }}>
                <Stack spacing={2.5}>
                    {!isEdit && (showLevel(form.levelTypeId, form.orgtypeId) || showCommunity(form.orgtypeId)) && (
                        <SectionCard icon={<CorporateFareIcon />} title="Zuordnung" subtitle="Ebene und Community der Organisation">
                            <Grid container spacing={2}>
                                {showLevel(form.levelTypeId, form.orgtypeId) && (
                                    <Grid size={{ xs: 12, sm: showCommunity(form.orgtypeId) ? 6 : 12 }}>
                                        {field('levelUuid', 'Ebene', {
                                            select: true,
                                            required: isBf(form.orgtypeId),
                                            // überschreibt helperText aus field(), daher Fehler zuerst
                                            helperText: errors.levelUuid || (isBf(form.orgtypeId) ? 'Nur Gemeinden ohne Berufsfeuerwehr' : undefined),
                                            children: [
                                                ...(!isBf(form.orgtypeId) ? [<MenuItem key="" value="">–</MenuItem>] : []),
                                                ...levels.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>),
                                            ],
                                        })}
                                    </Grid>
                                )}
                                {showCommunity(form.orgtypeId) && (
                                    <Grid size={{ xs: 12, sm: showLevel(form.levelTypeId, form.orgtypeId) ? 6 : 12 }}>
                                        {field('communityId', 'Community', { select: true, required: true, children: communities.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>) })}
                                    </Grid>
                                )}
                            </Grid>
                        </SectionCard>
                    )}

                    <SectionCard icon={<BadgeIcon />} title="Stammdaten" subtitle="Bezeichnung der Organisation">
                        {field('name', 'Name', {
                            required: true,
                            autoFocus: !isAutoName,
                            ...(isAutoName && { value: baseName, disabled: true }),
                            helperText: errors.name
                                || (isAutoName && !baseName
                                    ? (nameMode === 'level'
                                        ? 'Wird automatisch aus „BF“ + gewählter Ebene gebildet'
                                        : 'Wird automatisch aus Organisationsart + Community gebildet')
                                    : undefined)
                                || ((displayPrefix || nameSuffix) && baseName ? `Vollständiger Name: ${fullNamePreview}` : undefined),
                            slotProps: {
                                input: {
                                    ...(displayPrefix && { startAdornment: <InputAdornment position="start">{displayPrefix}</InputAdornment> }),
                                    ...(nameSuffix && { endAdornment: <InputAdornment position="end">{nameSuffix}</InputAdornment> }),
                                },
                            },
                        })}
                    </SectionCard>
                </Stack>
            </Grid>

            <Grid size={{ xs: 12, md: isEdit ? 12 : 6 }}>
                <Stack spacing={2.5}>
                    <SectionCard icon={<LocationOnIcon />} title="Adresse" subtitle="Anschrift der Organisation">
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 8 }}>{field('street', 'Straße')}</Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>{field('hnr', 'Hausnummer')}</Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>{field('postcode', 'PLZ', { required: true })}</Grid>
                            <Grid size={{ xs: 12, sm: 8 }}>{field('city', 'Stadt', { required: true })}</Grid>
                        </Grid>
                    </SectionCard>

                    <SectionCard icon={<ContactPhoneIcon />} title="Kontakt" subtitle="Erreichbarkeit der Organisation">
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 4 }}>{field('phone', 'Telefon', { slotProps: adornment(<PhoneIcon fontSize="small" />), type: 'tel' })}</Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>{field('fax', 'Fax', { slotProps: adornment(<PrintIcon fontSize="small" />) })}</Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>{field('email', 'E-Mail', { slotProps: adornment(<EmailIcon fontSize="small" />), type: 'email' })}</Grid>
                        </Grid>
                    </SectionCard>
                </Stack>
            </Grid>
        </Grid>
    );

    // ========== Schritt 3: Prüfen & anlegen ==========

    const renderReviewStep = () => {
        const address = [[form.street, form.hnr].filter(Boolean).join(' '), [form.postcode, form.city].filter(Boolean).join(' ')]
            .filter(Boolean).join(', ');
        const profile = [
            ['Ebenentyp', labelOf(levelTypes, form.levelTypeId)],
            ['Organisationsart', selectedOrgType?.label],
            showLevel(form.levelTypeId, form.orgtypeId) && ['Ebene', labelOf(levels, form.levelUuid)],
            showCommunity(form.orgtypeId) && ['Community', labelOf(communities, form.communityId)],
        ].filter(Boolean);
        const details = [
            ['Name', fullNamePreview],
            ['Adresse', address],
            ['Telefon', form.phone],
            ['Fax', form.fax],
            ['E-Mail', form.email],
        ];
        const renderFields = (rows) => (
            <Grid container spacing={2} component="dl" sx={{ m: 0 }}>
                {rows.map(([label, value]) => (
                    <Grid key={label} size={{ xs: 12, sm: 6 }}><InfoField label={label} value={value} /></Grid>
                ))}
            </Grid>
        );
        return (
            <Stack spacing={2.5}>
                <Alert severity="info">Bitte prüfe die Angaben. Mit „Anlegen“ wird die Organisation erstellt.</Alert>
                <SectionCard icon={<CorporateFareIcon />} title="Organisationsprofil">{renderFields(profile)}</SectionCard>
                <SectionCard icon={<FactCheckIcon />} title="Stammdaten & Kontakt">{renderFields(details)}</SectionCard>
            </Stack>
        );
    };

    const stepRenderers = [renderTypeStep, renderDetailsStep, renderReviewStep];
    const isLastStep = isEdit || activeStep === steps.length - 1;

    return (
        <AppDialog
            open={open}
            onClose={onClose}
            maxWidth={isEdit ? 'md' : 'lg'}
            tall={!isEdit}
            icon={<BusinessIcon />}
            title={isEdit ? 'Organisation bearbeiten' : 'Neue Organisation'}
            subtitle={isEdit ? 'Stammdaten, Adresse und Kontaktdaten anpassen' : `Schritt ${activeStep + 1} von ${steps.length}: ${steps[activeStep]}`}
            closeDisabled={loading}
            subheader={!isEdit && (
                <StepperBar>
                    <Stepper activeStep={activeStep} alternativeLabel>
                        {steps.map((label) => (
                            <Step key={label}><StepLabel>{label}</StepLabel></Step>
                        ))}
                    </Stepper>
                </StepperBar>
            )}
            actions={(
                <>
                    <Button onClick={onClose} variant="contained" color="inherit" disabled={loading} startIcon={<CloseIcon />}>Abbrechen</Button>
                    <Box sx={{ flex: 1 }} />
                    {!isEdit && activeStep > 0 && (
                        <Button onClick={handleBack} disabled={loading} startIcon={<ArrowBackIcon />} variant="outlined">Zurück</Button>
                    )}
                    {isLastStep ? (
                        <LoadingButton onClick={handleSubmit} loading={loading} loadingLabel="Speichert…" startIcon={<SaveIcon />} color={isEdit ? 'primary' : 'success'}>
                            {isEdit ? 'Speichern' : 'Anlegen'}
                        </LoadingButton>
                    ) : (
                        <Button onClick={handleNext} disabled={loading || dataLoading} endIcon={<ArrowForwardIcon />} variant="contained">Weiter</Button>
                    )}
                </>
            )}
        >
            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
            {dataLoading ? (
                <LoadingState size="lg" />
            ) : (
                <Box component="form" noValidate onSubmit={(e) => { e.preventDefault(); if (isLastStep) handleSubmit(); else handleNext(); }}>
                    {isEdit ? renderDetailsStep() : stepRenderers[activeStep]?.()}
                </Box>
            )}
        </AppDialog>
    );
};

export default OrganisationForm;
