import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { User } from '@core/models/user';
import { API_URL } from '../../../config';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  const baseUrl = API_URL;

  beforeEach(() => {
    // Given: Authentication service is configured
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    // Verify no pending HTTP requests
    httpMock.verify();
    localStorage.clear();
  });

  describe('Feature: User Authentication', () => {

    describe('Scenario: Successful login with valid credentials', () => {
      it('Given a user with valid credentials, When the user attempts to login, Then should authenticate successfully and store the token', (done) => {
        // Given: Valid credentials
        const username = 'testuser@example.com';
        const password = 'ValidPassword123!';
        const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIzLCJ1c2VybmFtZSI6InRlc3R1c2VyQGV4YW1wbGUuY29tIiwiZmlyc3ROYW1lIjoiVGVzdCIsImxhc3ROYW1lIjoiVXNlciIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNTE2MjM5MDIyfQ.4Adcj0HKXK4AU2S_jVYQv6tQnGJKkCMnGLlLN9v-XYQ';
        const mockResponse = { token: mockToken };

        // When: User attempts to login
        service.login(username, password).subscribe({
          next: (user: User) => {
            // Then: User should be authenticated
            expect(user).toBeDefined();
            expect(user.username).toBe('testuser@example.com');
            expect(user.token).toBe(mockToken);

            // And: Token should be stored in localStorage
            const storedUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            expect(storedUser.token).toBe(mockToken);
            expect(storedUser.username).toBe('testuser@example.com');

            // And: currentUserValue should be updated
            expect(service.currentUserValue.token).toBe(mockToken);
            done();
          },
          error: (error) => {
            fail('Should not produce error: ' + error);
            done();
          }
        });

        // Mock HTTP response
        const req = httpMock.expectOne(`${baseUrl}/authenticate`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ username, password });
        req.flush(mockResponse);
      });
    });

    describe('Scenario: Failed login with invalid credentials', () => {
      it('Given invalid credentials, When the user attempts to login, Then should reject authentication with 401 error', (done) => {
        // Given: Invalid credentials
        const username = 'wronguser@example.com';
        const password = 'WrongPassword';
        const mockError = {
          status: 401,
          statusText: 'Unauthorized',
          error: { message: 'Invalid credentials' }
        };

        // When: User attempts to login with incorrect credentials
        service.login(username, password).subscribe({
          next: () => {
            fail('Should not authenticate with invalid credentials');
            done();
          },
          error: (error) => {
            // Then: Should receive authentication error
            expect(error.status).toBe(401);
            expect(error.statusText).toBe('Unauthorized');

            // And: Should not have token in localStorage
            const storedUser = localStorage.getItem('currentUser');
            expect(storedUser).toBeNull();
            done();
          }
        });

        // Mock HTTP error
        const req = httpMock.expectOne(`${baseUrl}/authenticate`);
        req.flush(mockError.error, { status: mockError.status, statusText: mockError.statusText });
      });
    });

    describe('Scenario: Login with empty fields', () => {
      it('Given empty user fields, When attempting to login, Then should handle error appropriately', (done) => {
        // Given: Empty fields
        const username = '';
        const password = '';
        const mockError = {
          status: 400,
          statusText: 'Bad Request',
          error: { message: 'Username and password are required' }
        };

        // When: Login attempt with empty fields
        service.login(username, password).subscribe({
          next: () => {
            fail('Should not authenticate with empty fields');
            done();
          },
          error: (error) => {
            // Then: Should receive validation error
            expect(error.status).toBe(400);
            done();
          }
        });

        const req = httpMock.expectOne(`${baseUrl}/authenticate`);
        req.flush(mockError.error, { status: mockError.status, statusText: mockError.statusText });
      });
    });
  });

  describe('Feature: User Logout', () => {

    describe('Scenario: Successful logout', () => {
      it('Given an authenticated user, When the user logs out, Then should clear session data', (done) => {
        // Given: An authenticated user
        const mockUser = new User({
          id: 123,
          username: 'testuser@example.com',
          token: 'valid-token-123',
          firstName: 'Test',
          lastName: 'User',
          role: 'USER'
        });
        localStorage.setItem('currentUser', JSON.stringify(mockUser));

        // When: User logs out
        service.logout().subscribe({
          next: (result) => {
            // Then: Should clear localStorage
            const storedUser = localStorage.getItem('currentUser');
            expect(storedUser).toBeNull();

            // And: Should return success false
            expect(result.success).toBe(false);
            done();
          }
        });
      });
    });

    describe('Scenario: Logout without active session', () => {
      it('Given an unauthenticated user, When attempting to logout, Then should complete without errors', (done) => {
        // Given: No authenticated user
        expect(localStorage.getItem('currentUser')).toBeNull();

        // When: Attempting to logout
        service.logout().subscribe({
          next: (result) => {
            // Then: Should complete successfully
            expect(result.success).toBe(false);
            expect(localStorage.getItem('currentUser')).toBeNull();
            done();
          }
        });
      });
    });
  });

  describe('Feature: Password Change', () => {

    describe('Scenario: Successful password change', () => {
      it('Given a valid email, When password change is requested, Then should send request correctly', (done) => {
        // Given: A valid email
        const userEmail = 'user@example.com';
        const mockResponse = {
          success: true,
          message: 'An email with instructions has been sent'
        };

        // When: Password change is requested
        service.changePassword(userEmail).subscribe({
          next: (response) => {
            // Then: Should receive confirmation
            expect(response.success).toBe(true);
            expect(response.message).toContain('email');
            done();
          },
          error: (error) => {
            fail('Should not fail with valid email: ' + error);
            done();
          }
        });

        // Mock HTTP response
        const req = httpMock.expectOne(`${baseUrl}/change-password`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ userEmail });
        req.flush(mockResponse);
      });
    });

    describe('Scenario: Password change with invalid email', () => {
      it('Given an invalid email format, When password change is requested, Then should reject the request', (done) => {
        // Given: Invalid email format
        const userEmail = 'invalid-email-format';
        const mockError = {
          status: 400,
          statusText: 'Bad Request',
          error: { message: 'Invalid email format' }
        };

        // When: Attempting password change with invalid email
        service.changePassword(userEmail).subscribe({
          next: () => {
            fail('Should not accept invalid email');
            done();
          },
          error: (error) => {
            // Then: Should receive validation error
            expect(error.status).toBe(400);
            done();
          }
        });

        const req = httpMock.expectOne(`${baseUrl}/change-password`);
        req.flush(mockError.error, { status: mockError.status, statusText: mockError.statusText });
      });
    });

    describe('Scenario: Password change with unregistered email', () => {
      it('Given an email not registered in the system, When password change is requested, Then should return 404 error', (done) => {
        // Given: Unregistered email
        const userEmail = 'nonexistent@example.com';
        const mockError = {
          status: 404,
          statusText: 'Not Found',
          error: { message: 'User not found' }
        };

        // When: Attempting password change for non-existent user
        service.changePassword(userEmail).subscribe({
          next: () => {
            fail('Should not find non-existent user');
            done();
          },
          error: (error) => {
            // Then: Should return 404 error
            expect(error.status).toBe(404);
            expect(error.error.message).toContain('not found');
            done();
          }
        });

        const req = httpMock.expectOne(`${baseUrl}/change-password`);
        req.flush(mockError.error, { status: mockError.status, statusText: mockError.statusText });
      });
    });
  });

  describe('Feature: Get Current User', () => {

    describe('Scenario: Get authenticated user', () => {
      it('Given an authenticated user in the system, When current user is requested, Then should return user data', () => {
        // Given: Stored authenticated user
        const mockUser = new User({
          id: 456,
          username: 'current@example.com',
          token: 'current-token',
          firstName: 'Current',
          lastName: 'User',
          role: 'ADMIN'
        });
        localStorage.setItem('currentUser', JSON.stringify(mockUser));

        // Recreate service to load from localStorage
        service = new AuthService(TestBed.inject(HttpClientTestingModule) as any);

        // When: Current user is obtained
        const currentUser = service.currentUserValue;

        // Then: Should return correct user
        expect(currentUser).toBeDefined();
        expect(currentUser.id).toBe(456);
        expect(currentUser.username).toBe('current@example.com');
        expect(currentUser.role).toBe('ADMIN');
      });
    });

    describe('Scenario: Get user when no session exists', () => {
      it('Given no authenticated user, When current user is requested, Then should return empty object', () => {
        // Given: No user in localStorage
        localStorage.clear();
        service = new AuthService(TestBed.inject(HttpClientTestingModule) as any);

        // When: Current user is obtained
        const currentUser = service.currentUserValue;

        // Then: Should return empty object
        expect(currentUser).toBeDefined();
        expect(Object.keys(currentUser).length).toBe(0);
      });
    });
  });

  describe('Feature: JWT Token Handling', () => {

    describe('Scenario: Correct JWT token decoding', () => {
      it('Given a valid JWT token, When login is processed, Then should decode token correctly', (done) => {
        // Given: Valid JWT token with user information
        const username = 'jwt@example.com';
        const password = 'password';
        const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Nzg5LCJ1c2VybmFtZSI6Imp3dEBleGFtcGxlLmNvbSIsImZpcnN0TmFtZSI6IkpXVCIsImxhc3ROYW1lIjoiVGVzdCIsInJvbGUiOiJVU0VSIn0.zL_FvMRKJ_sQk8Q6bJZHtRCK0TFvCr8X8C3H7sTYqxE';
        const mockResponse = { token: validToken };

        // When: Login is performed and token is decoded
        service.login(username, password).subscribe({
          next: (user: User) => {
            // Then: Decoded data should be in user
            expect(user.id).toBe(789);
            expect(user.username).toBe('jwt@example.com');
            expect(user.firstName).toBe('JWT');
            expect(user.lastName).toBe('Test');
            expect(user.token).toBe(validToken);
            done();
          }
        });

        const req = httpMock.expectOne(`${baseUrl}/authenticate`);
        req.flush(mockResponse);
      });
    });
  });
});
