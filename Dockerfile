FROM node:20-slim

# Install system dependencies required by Playwright
# RUN apt-get update && apt-get install -y \
#   libnss3 libxss1 libappindicator3-1 libindicator7 \
#   libxkbcommon0 libgconf-2-4 libx11-xcb1 \
#   && rm -rf /var/lib/apt/lists/*

# Install pwvm globally
RUN npm install -g pwvm

# Setup pwvm (prints the setup instructions)
# RUN pwvm setup

# Root default
ENV PATH="/root/.pwvm/shims:${PATH}"

# --- Uncomment if running as non-root user ---
# USER app
# ENV PATH="/home/app/.pwvm/shims:${PATH}"

WORKDIR /app
COPY . .

# Uncomment to install multiple Playwright versions using RUN commands
RUN pwvm install 1.57.0 --no-browsers
# RUN pwvm install 1.40.0
# RUN pwvm install latest

RUN pwvm list

# At the end we override the CMD otherwise it will use default CMD ["node"] and you will enter a node REPL
CMD ["sh"]
