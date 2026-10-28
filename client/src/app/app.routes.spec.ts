import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { Login } from './auth/login/login';
import { WorkspaceHome } from './workspace/home/workspace-home';

describe('app routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes)],
    });
  });

  it('loads the login page at /login', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/login', Login);

    expect(component).toBeInstanceOf(Login);
  });

  it('loads the workspace page at /app without requiring authentication', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/app', WorkspaceHome);

    expect(component).toBeInstanceOf(WorkspaceHome);
  });

  it('redirects the root and unknown paths to /login', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');
    expect(TestBed.inject(Router).url).toBe('/login');

    await harness.navigateByUrl('/unknown');
    expect(TestBed.inject(Router).url).toBe('/login');
  });
});
