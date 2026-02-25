# Security Policy

## Reporting a Vulnerability

We take the security of Ragnarok seriously. If you believe you have found a security vulnerability, please report it to us responsibly.

**Please do not report security vulnerabilities through public GitHub issues.**

### How to Report

1. **Email**: Send details to the maintainers via GitHub private vulnerability reporting
2. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment**: We will acknowledge receipt within 48 hours
- **Updates**: We will keep you informed of our progress
- **Disclosure**: We will coordinate with you on public disclosure timing
- **Credit**: We will credit you in security advisories (unless you prefer anonymity)

## Scope

### In Scope

- The Ragnarok web application (theragnarok.fun)
- Smart contracts (when deployed)
- API endpoints
- Authentication and authorization
- Data handling and storage

### Out of Scope

- Third-party services (Supabase, Solana, Vercel)
- Social engineering attacks
- Denial of service attacks
- Issues in dependencies (report these upstream)

## Security Best Practices

When contributing to Ragnarok, please:

1. Never commit secrets, API keys, or credentials
2. Use environment variables for sensitive configuration
3. Validate and sanitize all user input
4. Follow the principle of least privilege
5. Keep dependencies updated

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |

We support the latest version on the main branch. Please ensure you are testing against the most recent code.
