# Everything the book build needs: Node (see compiler/.nvmrc), ghostscript, poppler, java for EPUBCheck
# and the shared libraries for the Chrome build Vivliostyle downloads
FROM node:24-trixie

ARG EPUBCHECK_VERSION=5.4.0

RUN apt-get update && apt-get install -y --no-install-recommends \
		ghostscript poppler-utils default-jre-headless unzip \
		libasound2 libatk-bridge2.0-0 libatk1.0-0 libcups2 libdrm2 libgbm1 libgtk-3-0 \
		libnss3 libxcomposite1 libxdamage1 libxfixes3 libxkbcommon0 libxrandr2 \
		libpango-1.0-0 libcairo2 fonts-liberation \
	&& rm -rf /var/lib/apt/lists/*

# `epubcheck book.epub` inside the container
RUN curl -sSfL -o /tmp/epubcheck.zip "https://github.com/w3c/epubcheck/releases/download/v${EPUBCHECK_VERSION}/epubcheck-${EPUBCHECK_VERSION}.zip" \
	&& unzip -q /tmp/epubcheck.zip -d /opt \
	&& rm /tmp/epubcheck.zip \
	&& printf '#!/bin/sh\nexec java -jar /opt/epubcheck-%s/epubcheck.jar "$@"\n' "$EPUBCHECK_VERSION" > /usr/local/bin/epubcheck \
	&& chmod +x /usr/local/bin/epubcheck

USER node
