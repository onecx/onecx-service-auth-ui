import factory, { CustomAuthService } from './custom-auth-service';
import { AuthService, Injectables } from './auth.service';
import { ExtensionsInternalApi, ConfigResponse } from './shared/generated';

describe('CustomAuthService', () => {
  let mockAuthService: jest.Mocked<AuthService>;
  let customAuthService: CustomAuthService;
  const mockConfig = {
    AUTH_SERVICE_CUSTOM_BFF_URL: 'https://mock-bff-url.com',
  };

  beforeEach(() => {
    mockAuthService = {
      init: jest.fn(),
      getHeaderValues: jest.fn(),
      logout: jest.fn(),
      updateTokenIfNeeded: jest.fn(),
      keycloakService: undefined,
      keycloak: undefined,
    };

    customAuthService = new CustomAuthService(mockAuthService, mockConfig);

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (key: string) => {
          if (key === 'kcIdpHint') return null;
          if (key === 'logoutRedirectUrl') return '/?idmId=mock-idm';
          return null;
        },
        setItem: jest.fn(),
      },
      writable: true,
    });
  });

  describe('init', () => {
    it('should fetch config and call keycloakAuthService.init', async () => {
      const mockResponse: ConfigResponse = {
        url: 'https://auth-url.com',
        idpHint: 'mock-idp',
        idmId: 'mock-idm',
      };

      jest
        .spyOn(ExtensionsInternalApi.prototype, 'getConfiguration')
        .mockResolvedValue(mockResponse);

      mockAuthService.init.mockResolvedValue(true);

      const result = await customAuthService.init();

      expect(mockAuthService.init).toHaveBeenCalledWith({
        idpHint: 'mock-idp',
        url: 'https://auth-url.com',
      });
      expect(result).toBe(true);
    });
  });

  describe('getHeaderValues', () => {
    it('should delegate to keycloakAuthService.getHeaderValues', () => {
      mockAuthService.getHeaderValues.mockReturnValue({
        Authorization: 'Bearer token',
      });

      const headers = customAuthService.getHeaderValues();

      expect(headers).toEqual({ Authorization: 'Bearer token' });
    });
  });

  describe('logout', () => {
    it('should perform POST logout if keycloak instance is available', async () => {
      const mockKeycloakInstance = {
        createLogoutUrl: jest.fn().mockReturnValue('https://logout-url.com'),
        idToken: 'id-token',
        clientId: 'client-id',
        refreshToken: 'refresh-token',
      };

      mockAuthService.keycloakService = {
        getKeycloakInstance: () => mockKeycloakInstance,
      };

      const fetchMock = jest.fn().mockResolvedValue({
        redirected: true,
        url: 'https://redirect-url.com',
        ok: true,
      });
      global.fetch = fetchMock as any;

      Object.defineProperty(window, 'location', {
        value: { href: 'https://current-url.com' },
        writable: true,
      });

      await customAuthService.logout();

      expect(mockKeycloakInstance.createLogoutUrl).toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalled();
    });

    it('should fallback to GET logout if no keycloak instance is available', () => {
      mockAuthService.keycloakService = undefined;
      customAuthService.logout();

      expect(mockAuthService.logout).toHaveBeenCalled();
    });
  });

  describe('updateTokenIfNeeded', () => {
    it('should delegate to keycloakAuthService.updateTokenIfNeeded', async () => {
      mockAuthService.updateTokenIfNeeded.mockResolvedValue(true);

      const result = await customAuthService.updateTokenIfNeeded();

      expect(result).toBe(true);
    });
  });

  it('should throw error if logout response is not ok and not redirected', async () => {
    const mockKeycloakInstance = {
      createLogoutUrl: jest.fn().mockReturnValue('https://logout-url.com'),
      idToken: 'id-token',
      clientId: 'client-id',
      refreshToken: 'refresh-token',
    };

    mockAuthService.keycloakService = {
      getKeycloakInstance: () => mockKeycloakInstance,
    };

    global.fetch = jest.fn().mockResolvedValue({
      redirected: false,
      ok: false,
      url: 'https://logout-url.com',
    });

    try {
      await customAuthService.logout();
      throw new Error('Logout failed, request returned an error code.');
    } catch (error) {
      expect((error as Error).message).toBe(
        'Logout failed, request returned an error code.'
      );
    }
  });

  it('should fallback to GET logout if no keycloak instance is available', () => {
    mockAuthService.keycloakService = undefined;
    mockAuthService.keycloak = undefined;

    customAuthService.logout();

    expect(mockAuthService.logout).toHaveBeenCalled();
  });

  it('should redirect if logout response is redirected', async () => {
    const mockKeycloakInstance = {
      createLogoutUrl: jest.fn().mockReturnValue('https://logout-url.com'),
      idToken: 'id-token',
      clientId: 'client-id',
      refreshToken: 'refresh-token',
    };

    mockAuthService.keycloakService = {
      getKeycloakInstance: () => mockKeycloakInstance,
    };

    global.fetch = jest.fn().mockResolvedValue({
      redirected: true,
      url: 'https://redirect-url.com',
      ok: true,
    });

    delete (window as any).location;
    (window as any).location = { href: '' };

    await customAuthService.logout();

    expect(window.location.href).toBe('https://redirect-url.com');
  });

  it('should reload page if logout response is ok but not redirected', async () => {
    const mockKeycloakInstance = {
      createLogoutUrl: jest.fn().mockReturnValue('https://logout-url.com'),
      idToken: 'id-token',
      clientId: 'client-id',
      refreshToken: 'refresh-token',
    };

    mockAuthService.keycloakService = {
      getKeycloakInstance: () => mockKeycloakInstance,
    };

    global.fetch = jest.fn().mockResolvedValue({
      redirected: false,
      ok: true,
      url: 'https://logout-url.com',
    });

    const reloadMock = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
    });

    await customAuthService.logout();

    expect(reloadMock).toHaveBeenCalled();
  });

  it('should create CustomAuthService synchron synchronously if no Promises are returned', () => {
    const mockAuthService = {
      init: jest.fn(),
      getHeaderValues: jest.fn(),
      logout: jest.fn(),
      updateTokenIfNeeded: jest.fn(),
    };

    const mockConfig = {
      AUTH_SERVICE_CUSTOM_BFF_URL: 'https://mock-bff-url.com',
    };

    const injectorFunction = (injectable: Injectables) => {
      if (injectable === Injectables.KEYCLOAK_AUTH_SERVICE)
        return mockAuthService;
      if (injectable === Injectables.CONFIG) return mockConfig;
      return null;
    };

    const result = factory(injectorFunction);

    expect(result).toBeInstanceOf(CustomAuthService);
  });

  it('should create CustomAuthService asynchronously if Promises are returned', async () => {
    const mockAuthService = {
      init: jest.fn(),
      getHeaderValues: jest.fn(),
      logout: jest.fn(),
      updateTokenIfNeeded: jest.fn(),
    };

    const mockConfig = {
      AUTH_SERVICE_CUSTOM_BFF_URL: 'https://mock-bff-url.com',
    };

    const injectorFunction = (injectable: Injectables) => {
      if (injectable === Injectables.KEYCLOAK_AUTH_SERVICE)
        return Promise.resolve(mockAuthService);
      if (injectable === Injectables.CONFIG) return Promise.resolve(mockConfig);
      return null;
    };

    const result = await factory(injectorFunction);

    expect(result).toBeInstanceOf(CustomAuthService);
  });

  it('should handle missing kcIdpHint and logoutRedirectUrl gracefully', async () => {
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (key: string) => null,
        setItem: jest.fn(),
      },
      writable: true,
    });

    const mockResponse: ConfigResponse = {
      url: 'https://auth-url.com',
      idpHint: undefined,
      idmId: undefined,
    };

    jest
      .spyOn(ExtensionsInternalApi.prototype, 'getConfiguration')
      .mockResolvedValue(mockResponse);

    mockAuthService.init.mockResolvedValue(true);

    const result = await customAuthService.init();

    expect(mockAuthService.init).toHaveBeenCalledWith({
      idpHint: undefined,
      url: 'https://auth-url.com',
    });
    expect(result).toBe(true);
  });

  it('should use kcIdpHint and extract idmId from logoutRedirectUrl', async () => {
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (key: string) => {
          if (key === 'kcIdpHint') return 'test-idp';
          if (key === 'logoutRedirectUrl') return '/?idmId=abc123';
          return null;
        },
        setItem: jest.fn(),
      },
      writable: true,
    });

    const mockResponse: ConfigResponse = {
      url: 'https://auth-url.com',
      idpHint: 'test-idp',
      idmId: 'abc123',
    };

    jest
      .spyOn(ExtensionsInternalApi.prototype, 'getConfiguration')
      .mockResolvedValue(mockResponse);

    mockAuthService.init.mockResolvedValue(true);

    const result = await customAuthService.init();

    expect(mockAuthService.init).toHaveBeenCalledWith({
      idpHint: 'test-idp',
      url: 'https://auth-url.com',
    });
    expect(result).toBe(true);
  });

  it('should not overwrite config if already provided', async () => {
    const initialConfig = { custom: 'value' };

    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn().mockReturnValue(null),
        setItem: jest.fn(),
      },
      writable: true,
    });

    const mockResponse: ConfigResponse = {
      url: 'https://auth-url.com',
      idpHint: undefined,
      idmId: undefined,
    };

    jest
      .spyOn(ExtensionsInternalApi.prototype, 'getConfiguration')
      .mockResolvedValue(mockResponse);

    mockAuthService.init.mockResolvedValue(true);

    const result = await customAuthService.init(initialConfig);

    expect(mockAuthService.init).toHaveBeenCalledWith({
      idpHint: undefined,
      url: 'https://auth-url.com',
    });
    expect(result).toBe(true);
  });
});
