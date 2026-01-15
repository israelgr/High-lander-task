#!/bin/bash

# Script to download and prepare OSRM data for Israel region
# Run this before starting Docker Compose

set -e

OSRM_DATA_DIR="./docker/osrm/data"
REGION="israel-and-palestine"
PBF_URL="https://download.geofabrik.de/asia/${REGION}-latest.osm.pbf"

mkdir -p "$OSRM_DATA_DIR"
cd "$OSRM_DATA_DIR"

# Download OSM data if not exists
if [ ! -f "${REGION}-latest.osm.pbf" ]; then
    echo "Downloading OSM data for ${REGION}..."
    curl -L -o "${REGION}-latest.osm.pbf" "$PBF_URL"
else
    echo "OSM data already exists, skipping download"
fi

# Extract and prepare OSRM data
if [ ! -f "${REGION}-latest.osrm" ]; then
    echo "Extracting OSRM data (this may take a while)..."
    docker run -t -v "$(pwd):/data" osrm/osrm-backend osrm-extract -p /opt/foot.lua /data/${REGION}-latest.osm.pbf

    echo "Partitioning..."
    docker run -t -v "$(pwd):/data" osrm/osrm-backend osrm-partition /data/${REGION}-latest.osrm

    echo "Customizing..."
    docker run -t -v "$(pwd):/data" osrm/osrm-backend osrm-customize /data/${REGION}-latest.osrm
else
    echo "OSRM data already prepared"
fi

echo "OSRM setup complete!"
echo "You can now run: docker-compose up"
