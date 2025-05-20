FROM node:lts

# Install system dependencies including Python and PDF tools
RUN apt-get update && \
    apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 && \
    rm -rf /var/lib/apt/lists/*

# Create and switch to non-root user
RUN useradd -m appuser && \
    mkdir -p /app && \
    chown -R appuser:appuser /app

WORKDIR /app

# Copy package files first for layer caching
COPY --chown=appuser:appuser package.json package-lock.json requirements.txt ./

# Create virtual environment
RUN python3 -m venv /app/venv

# Install Python dependencies in virtual environment
RUN . /app/venv/bin/activate && \
    pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir pymupdf==1.23.7  # Explicitly install working version

# Install Node.js dependencies
RUN npm install

# Verify critical packages are installed
RUN . /app/venv/bin/activate && \
    python -c "import fitz" && \
    npm ls dotenv || (echo "Critical packages not installed" && exit 1)

# Copy application files
COPY --chown=appuser:appuser . .

# Switch to non-root user
USER appuser

# Activate virtual environment when running the app
ENV PATH="/app/venv/bin:$PATH"

EXPOSE 3000
CMD ["npm", "start"]