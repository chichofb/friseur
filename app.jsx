import React from 'react';
import { useAuth } from './useAuth';
import Benutzerliste from './components/Benutzerliste';
import OrganisationVerwaltung from './components/OrganisationVerwaltung';
import DsgvoConsentDialog from './components/DsgvoConsentDialog';
import AppShell from './layouts/AppShell';
import { VIEWS } from './layouts/navigationConfig';
import LoadingState from './components/shared/LoadingState';
import { parseDsgvoAccepted, isDsgvoRequired } from './utils/dsgvo';
import userService, { setKeycloakInstance, setContextOrgUuid as setServiceContextOrgUuid } from './services';

function App() {
    const { keycloak, initialized } = useAuth();
    const [activeView, setActiveView] = React.useState(VIEWS.USERS);

    // 'checking' | 'required' | 'ok' – bis 'ok' wird nichts außer dem Profil geladen
    const [consent, setConsent] = React.useState('checking');

    // Globaler Organisations-Kontext (wirkt sich auf alle Ansichten aus, die ihn benötigen)
    const [myOrganisations, setMyOrganisations] = React.useState([]);
    const [contextOrgUuid, setContextOrgUuid] = React.useState('');
    const [contextReady, setContextReady] = React.useState(false);
    const [contextError, setContextError] = React.useState(null);

    React.useEffect(() => {
        if (!keycloak?.authenticated) return;
        setKeycloakInstance(keycloak);
        userService.getMyProfile()
            .then((profile) => setConsent(parseDsgvoAccepted(profile) === false ? 'required' : 'ok'))
            // Andere Fehler nicht blockieren, die normale Fehlermeldung kommt beim Laden der Orgs
            .catch((err) => setConsent(isDsgvoRequired(err) ? 'required' : 'ok'));
    }, [keycloak?.authenticated]);

    React.useEffect(() => {
        if (consent !== 'ok') return;

        const orgIdOf = (o) => o.uuid || '';

        userService.getMyOrganisations()
            .then((orgData) => {
                const opts = orgData.options || [];
                setMyOrganisations(opts);
                if (opts.length === 0) {
                    setContextError('Keine Organisationen zugewiesen.');
                    return;
                }
                const defaultExists = opts.some((o) => orgIdOf(o) === orgData.defaultUuid);
                const firstOrgId = (orgData.defaultUuid && defaultExists) ? orgData.defaultUuid : orgIdOf(opts[0]);
                setContextOrgUuid(firstOrgId);
                setServiceContextOrgUuid(firstOrgId);
            })
            .catch(() => {
                setContextError('Fehler beim Laden der eigenen Organisationen.');
            })
            .finally(() => setContextReady(true));
    }, [consent]);

    const handleContextOrgChange = (newOrgUuid) => {
        setContextOrgUuid(newOrgUuid);
        setServiceContextOrgUuid(newOrgUuid);
    };

    if (!initialized) {
        return <LoadingState fullscreen label="Lade Authentifizierung…" />;
    }

    if (keycloak?.authenticated && consent === 'checking') {
        return <LoadingState fullscreen label="Prüfe Zugang…" />;
    }

    if (keycloak?.authenticated && consent === 'required') {
        return <DsgvoConsentDialog onAccepted={() => setConsent('ok')} />;
    }

    return (
        <AppShell
            activeView={activeView}
            onViewChange={setActiveView}
            organisations={myOrganisations}
            contextOrgUuid={contextOrgUuid}
            onContextOrgChange={handleContextOrgChange}
            authenticated={Boolean(keycloak?.authenticated)}
        >
            {activeView === VIEWS.USERS
                ? <Benutzerliste contextOrgUuid={contextOrgUuid} contextReady={contextReady} contextError={contextError} />
                : <OrganisationVerwaltung />}
        </AppShell>
    );
}

export default App;
