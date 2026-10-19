import React, { useState, useEffect } from 'react';
import { Alert, Button, Grid, InputAdornment, MenuItem, Stack, TextField } from '@mui/material';
import {
    Business as BusinessIcon, LocationOn as LocationOnIcon, ContactPhone as ContactPhoneIcon,
    CorporateFare as CorporateFareIcon, Phone as PhoneIcon, Print as PrintIcon,
    Email as EmailIcon, Badge as BadgeIcon, Save as SaveIcon,
} from '@mui/icons-material';
import { organisationService } from '../services';
import { AppDialog, SectionCard, LoadingButton, LoadingState } from './shared';

const emptyForm = {
    name: '', orgtypeId: '', levelTypeId: '', levelUuid: '', communityId: '',
    phone: '', fax: '', email: '', street: '', hnr: '', city: '', postcode: '',
};

const adornment = (icon) => ({
    input: { startAdornment: <InputAdornment position="start">{icon}</InputAdornment> },
});

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

    useEffect(() => {
        if (!open) return;
        setError(null);
        setErrors({});
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
        setForm((prev) => ({ ...prev, levelTypeId, levelUuid: '', orgtypeId: '' }));
        setErrors((prev) => ({ ...prev, levelTypeId: undefined }));
        setLevels([]);
        setOrgTypes([]);
        const [lv, ot] = await Promise.allSettled([
            organisationService.getLevels({ levelTypeId: Number(levelTypeId) }),
            organisationService.getOrgTypes({ createLevelTypeId: Number(levelTypeId) }),
        ]);
        setLevels(lv.status === 'fulfilled' ? lv.value.options || [] : []);
        setOrgTypes(ot.status === 'fulfilled' ? ot.value.options || [] : []);
        setError(ot.status === 'rejected' || lv.status === 'rejected'
            ? 'Auswahllisten für den Ebenentyp konnten nicht geladen werden.'
            : null);
    };

    const handleChange = (field) => (e) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

    const validate = () => {
        const e = {};
        if (!form.name?.trim()) e.name = 'Name ist erforderlich';
        if (!form.city?.trim()) e.city = 'Stadt ist erforderlich';
        if (!form.postcode?.trim()) e.postcode = 'PLZ ist erforderlich';
        if (!isEdit) {
            if (form.levelTypeId === '' || form.levelTypeId === null) e.levelTypeId = 'Ebenentyp ist erforderlich';
            if (form.orgtypeId === '' || form.orgtypeId === null) e.orgtypeId = 'Organisationstyp ist erforderlich';
            if (form.communityId === '' || form.communityId === null) e.communityId = 'Community ist erforderlich';
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setLoading(true);
        setError(null);
        try {
            const baseData = {
                name: form.name,
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
                const payload = { ...baseData, orgtypeId: Number(form.orgtypeId), communityId: Number(form.communityId), levelTypeId: Number(form.levelTypeId) };
                if (form.levelUuid) payload.levelUuid = form.levelUuid;
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

    return (
        <AppDialog
            open={open}
            onClose={onClose}
            maxWidth={isEdit ? 'md' : 'lg'}
            icon={<BusinessIcon />}
            title={isEdit ? 'Organisation bearbeiten' : 'Neue Organisation'}
            subtitle={isEdit ? 'Stammdaten, Adresse und Kontaktdaten anpassen' : 'Organisationsprofil, Stammdaten und Kontaktdaten erfassen'}
            closeDisabled={loading}
            actions={(
                <>
                    <Button onClick={onClose} variant="contained" color="inherit" disabled={loading}>Abbrechen</Button>
                    <LoadingButton onClick={handleSubmit} loading={loading} loadingLabel="Speichert…" startIcon={<SaveIcon />}>
                        {isEdit ? 'Speichern' : 'Anlegen'}
                    </LoadingButton>
                </>
            )}
        >
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {dataLoading ? (
                <LoadingState size="lg" />
            ) : (
                <Grid container spacing={2.5} component="form" noValidate onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                    <Grid size={{ xs: 12, md: isEdit ? 12 : 6 }}>
                        <Stack spacing={2.5}>
                            {!isEdit && (
                                <SectionCard icon={<CorporateFareIcon />} title="Organisationsprofil" subtitle="Typ, Ebene und Community der Organisation">
                                    <Grid container spacing={2}>
                                        <Grid size={{ xs: 12, sm: 6 }}>
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
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            {field('levelUuid', 'Ebene', { select: true, disabled: levels.length === 0, children: [<MenuItem key="" value="">–</MenuItem>, ...levels.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)] })}
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            {field('orgtypeId', 'Organisationstyp', { select: true, required: true, disabled: form.levelTypeId === '', children: orgTypes.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>) })}
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            {field('communityId', 'Community', { select: true, required: true, children: communities.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>) })}
                                        </Grid>
                                    </Grid>
                                </SectionCard>
                            )}

                            <SectionCard icon={<BadgeIcon />} title="Stammdaten" subtitle="Bezeichnung der Organisation">
                                {field('name', 'Name', { required: true, autoFocus: true })}
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
            )}
        </AppDialog>
    );
};

export default OrganisationForm;
