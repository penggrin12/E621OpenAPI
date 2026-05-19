#!/bin/bash
set -euo pipefail
cp openapi.yaml openapi.yaml.bck

npm run build:openapi
npm run lint:validate
npm run lint:api

rm openapi.yaml
mv openapi.yaml.bck openapi.yaml
