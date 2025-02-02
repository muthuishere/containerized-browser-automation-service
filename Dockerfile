FROM debian:bullseye

# Install packages and clean up in a single RUN to reduce layers
RUN set -ex; \
    apt-get update && \
    apt-get install -y \
    bash \
    wget \
    net-tools \
    novnc \
    supervisor \
    x11vnc \
    xvfb \
    chromium \
    curl \
    unzip \
    websockify \
    openbox \
    dbus-x11 \
    # Font packages
    fonts-liberation \
    fonts-noto \
    fonts-noto-cjk \
    fonts-noto-color-emoji \
    fonts-noto-mono \
    fonts-freefont-ttf \
    fonts-dejavu \
    fontconfig \
    # Playwright dependencies
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    && fc-cache -f -v \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /var/cache/apt/* \
    && rm -rf /var/cache/fontconfig/* \
    && rm -rf /tmp/* \
    && rm -rf /var/tmp/*

RUN wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb \
    && apt-get update \
    && apt-get install -y ./google-chrome-stable_current_amd64.deb \
    && rm google-chrome-stable_current_amd64.deb \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /var/cache/apt/*

# Install Firefox
#RUN #apt-get install -y firefox-esr

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

# Setup environment variables
ENV HOME=/root \
    DEBIAN_FRONTEND=noninteractive \
    LANG=en_US.UTF-8 \
    LANGUAGE=en_US.UTF-8 \
    LC_ALL=C.UTF-8 \
    DISPLAY=:0 \
    DISPLAY_WIDTH=1024 \
    DISPLAY_HEIGHT=768

# Create openbox config directory
RUN mkdir -p /root/.config/openbox

# Copy openbox configuration
COPY docker/openbox/rc.xml /root/.config/openbox/

# Create and set working directory
WORKDIR /app

COPY docker/conf.d/ /app/conf.d/
COPY docker/supervisord.conf /app/
COPY docker/entrypoint.sh /app/
COPY docker/openbox/start-openbox.sh /app/

# Make scripts executable
RUN chmod +x /app/entrypoint.sh /app/start-openbox.sh

# Copy package files and install dependencies
COPY package.json bun.lockb ./
RUN bun install

# Copy source code
COPY src/ /app/src/

CMD ["/app/entrypoint.sh"]
EXPOSE 8080 3000
