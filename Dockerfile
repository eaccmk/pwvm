# Reference Dockerfile for projects that want to install pwvm from npm
# and keep multiple Playwright versions available inside one image.
FROM node:20-slim

# If your container will actually launch browsers, install the OS packages
# required by your target Playwright/browser combination here.
# RUN apt-get update && apt-get install -y ... && rm -rf /var/lib/apt/lists/*

# Create a non-root user so pwvm state lives outside of /root and the
# container behavior matches common production/container setups.
RUN useradd --create-home --shell /bin/sh app
RUN mkdir -p /home/app/.npm-global /workspace \
  && chown -R app:app /home/app /workspace

USER app
ENV HOME=/home/app

# Install global npm binaries into the non-root user's home directory.
ENV NPM_CONFIG_PREFIX=/home/app/.npm-global
ENV PATH=/home/app/.npm-global/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# Install pwvm from the public npm registry.
RUN npm install -g pwvm

# Create the pwvm shims for this user and make them available to later layers.
RUN pwvm setup
ENV PATH=/home/app/.pwvm/shims:/home/app/.npm-global/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# Optionally preinstall and cache the Playwright versions you care about.
# Keep --no-browsers if the goal is version routing only.
RUN pwvm install 1.40.0 --no-browsers
RUN pwvm install 1.57.0 --no-browsers

# Pick the default active version for plain `playwright` commands.
RUN pwvm use 1.57.0

# Helpful smoke check during image build.
RUN pwvm list && playwright --version

WORKDIR /workspace

# Override Node's default image command so interactive runs open a shell.
CMD ["sh"]
