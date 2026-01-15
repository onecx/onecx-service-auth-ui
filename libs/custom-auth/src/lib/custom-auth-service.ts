import { AuthService, AuthServiceFactory, Injectables } from './auth.service';
import {
  Configuration,
  ExtensionsInternalApi,
  ConfigResponse,
} from './shared/generated';

export class CustomAuthService implements AuthService {
  private bffServiceURL: string;

  constructor(
    private keycloakAuthService: AuthService,
    config: Record<string, string>
  ) {
    this.bffServiceURL = config['AUTH_SERVICE_CUSTOM_BFF_URL'];
  }

  async init(config?: Record<string, unknown> | undefined): Promise<boolean> {
    config ??= {};

    let configuration = new Configuration({
      basePath: this.bffServiceURL,
    });

    let postsApi = new ExtensionsInternalApi(configuration);

    const configResponse: ConfigResponse = await postsApi.getConfiguration({
      configRequest: {
        href: window.location.href,
        idpHint: localStorage.getItem('kcIdpHint') ?? undefined,
        idmId:
          new URL(
            localStorage.getItem('logoutRedirectUrl') ?? '/',
            window.origin
          ).searchParams.get('idmId') ??
          localStorage.getItem('idmId') ??
          undefined,
      },
    });

    const { url, idpHint, idmId } = configResponse;

    if (idpHint) {
      localStorage.setItem('kcIdpHint', idpHint);
    }

    if (idmId) {
      localStorage.setItem('idmId', idmId);
    }

    config = {
      idpHint,
      url,
    };

    return this.keycloakAuthService.init(config);
  }
  getHeaderValues(): Record<string, string> {
    return this.keycloakAuthService.getHeaderValues();
  }
  logout(): void {
    const keycloakInstance = this.keycloakAuthService.keycloakService
      ? this.keycloakAuthService.keycloakService.getKeycloakInstance()
      : this.keycloakAuthService.keycloak;

    if (keycloakInstance) {
      const logoutUrl = keycloakInstance.createLogoutUrl({
        logoutMethod: 'POST',
      });
      fetch(new URL(logoutUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          id_token_hint: keycloakInstance.idToken,
          client_id: keycloakInstance.clientId,
          refresh_token: keycloakInstance.refreshToken,
          post_logout_redirect_uri: location.href,
        }),
      }).then((response) => {
        if (response.redirected) {
          window.location.href = response.url;
          return;
        }

        if (response.ok) {
          window.location.reload();
          return;
        }
        throw new Error('Logout failed, request returned an error code.');
      });
    } else {
      console.warn('Could not logout via POST. Using GET.');
      this.keycloakAuthService.logout();
    }
  }

  updateTokenIfNeeded(): Promise<boolean> {
    return this.keycloakAuthService.updateTokenIfNeeded();
  }
}

const factory: AuthServiceFactory = (
  injectorFunction: (injectable: Injectables) => Promise<unknown> | unknown
): Promise<AuthService> | AuthService => {
  const authService = injectorFunction(Injectables.KEYCLOAK_AUTH_SERVICE) as
    | AuthService
    | Promise<AuthService>;
  const config = injectorFunction(Injectables.CONFIG) as
    | Record<string, string>
    | Promise<Record<string, string>>;

  if ('then' in authService || 'then' in config) {
    return Promise.all([
      Promise.resolve(authService),
      Promise.resolve(config),
    ]).then(([auth, conf]) => new CustomAuthService(auth, conf));
  }
  return new CustomAuthService(authService, config);
};

export default factory;
