# Railway Deployment Design

The GitHub repository currently stores `mainfile/alab-system` as a Git
submodule pointer without a `.gitmodules` definition. Railway therefore
checks out the parent repository without the Next.js source files and cannot
detect or build the application.

The fix keeps the application in `mainfile/alab-system`, converts it to normal
files tracked by the parent repository, and adds a small root Node package.
Railway will detect Node at the repository root, run the nested Next.js build,
then launch Next.js through a cross-platform script that binds to
`0.0.0.0` and Railway's assigned `PORT`.

The existing landing-page UI and application routes will not be modified.
Automated tests will verify that the app is no longer a gitlink and that the
root build, start, and health-check configuration remains deployable.
