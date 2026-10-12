import React, { useState } from 'react';
import { Alert, Button, Typography } from '@mui/material';
import { PrivacyTip as PrivacyTipIcon } from '@mui/icons-material';
import { useAuth } from '../useAuth';
import userService from '../services';
import { AppDialog, LoadingButton } from './shared';

// Kein eigenes Laden: App.jsx entscheidet, ob er angezeigt wird. Nicht schließbar, bis entschieden wurde.
const DsgvoConsentDialog = ({ onAccepted }) => {
    const { keycloak } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(false);

    const accept = async () => {
        setSubmitting(true);
        setError(false);
        try {
            await userService.acceptMyDsgvo();
            onAccepted();
        } catch {
            setError(true);
            setSubmitting(false);
        }
    };

    return (
        <AppDialog
            open
            icon={<PrivacyTipIcon />}
            title="Datenschutzerklärung (DSGVO)"
            subtitle="Bitte stimmen Sie der Verarbeitung Ihrer Daten zu"
            maxWidth="sm"
            actions={(
                <>
                    <Button color="inherit" onClick={() => keycloak.logout()} disabled={submitting}>
                        Ablehnen &amp; abmelden
                    </Button>
                    <LoadingButton onClick={accept} loading={submitting} loadingLabel="Speichert…">
                        Akzeptieren
                    </LoadingButton>
                </>
            )}
        >
            <Typography variant="body1" sx={{ mb: 2 }}>
                Zur Nutzung der Anwendung werden Ihre personenbezogenen Daten (z. B. Name, E-Mail-Adresse,
                Organisationszuordnung) verarbeitet. Bitte bestätigen Sie, dass Sie damit einverstanden sind.
            </Typography>
            <Typography variant="body2" color="text.secondary">
                Ihre Einwilligung können Sie jederzeit in den Profileinstellungen widerrufen.
            </Typography>
            {error && <Alert severity="error" sx={{ mt: 2 }}>Die Zustimmung konnte nicht gespeichert werden.</Alert>}
        </AppDialog>
    );
};

export default DsgvoConsentDialog;
