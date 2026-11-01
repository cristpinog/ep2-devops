#!/bin/sh
set -eu

for service in catalog inventory; do
  manifest="services/${service}/package.json"
  lockfile="services/${service}/package-lock.json"

  test -f "$manifest"
  test -f "$lockfile"

  dependency_count=$(node -e '
    const fs = require("node:fs");
    const manifest = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const groups = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];
    console.log(groups.reduce((total, group) => total + Object.keys(manifest[group] || {}).length, 0));
  ' "$manifest")

  if [ "$dependency_count" -eq 0 ]; then
    echo "::notice file=${manifest}::Sin dependencias npm externas; Snyk Open Source no tiene un grafo que analizar"
  else
    npx --no-install snyk test --file="$manifest" --package-manager=npm --severity-threshold=high
  fi
done
