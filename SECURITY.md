# Security policy

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting for this repository. Do not
open a public issue for a suspected vulnerability, exposed credential, or other
sensitive finding.

## Public-repository boundary

This repository contains only public application data and public newsletter
content. API keys, OAuth client secrets, refresh tokens, access tokens, subscriber
addresses, recipient lists, and sender credentials must be stored only in the
protected secret store used by the deployment workflow. They must never be added
to source files, workflow variables, build artifacts, logs, issues, or pull
requests.
