# EMR Exporter

The EMR Exporter is a component of the Health Data Coalition technology suite. It is used to extract the data necessary to populate the Universal Schema from an  Electronic Medical Record (EMR) relational database and transfer that data to an Endpoint. It is vendor agnostic and should work with all EMRs that are backed by a relational SQL database.

## Requirements
The following requirements must be met to run the EMR Exporter:

* The source EMR Database must be MySQL or Postgres. Support for further DBMS will be added as necessary.
* A role/user must be created in the EMR Database with read access to the database.
* The EMR Exporter must be executed on the same server that is running the EMR Database.
* A private/public key pair must be generated on the EMR Database server. The public key must be installed onto the target server (eg Endpoint).
* The target server must have a user that can connect over ssh via public key authentication.

## Installation
For production usage, it is recommended to use one of the pre-compiled releases. These releases are
distributed as a single executable file that have no dependencies.

1. Download the application appropriate to the OS from the release page.
2. Create a public/private key pair.
3. Create a configuration file
4. Edit the configuration file. Specifically update the database and target.
5. Ensure that the working directory has appropriate permissions.
6. Send the public key and ip information to the remote server.

### Commands

| Command            | Description                                                       |
| ------------------ |------------------------------------------------------------------ |
| `npm install`      | Install package dependencies. Must be run before npm start.       |
| `npm start`        | Run the exporter.                                                 |
| `npm test`         | Run the automated test: which don't exist. Anyone with free time? |
| `npm outdated`     | Check for outdated packages.                                      |
| `npm run lint`     | Check the coding style using eslint and the Airbnb styleguide.    |
| `npm run depcheck` | Check the project for dependency issues.                          |
| `npm run seccheck` | Check the project for known security vulnerabilities.             |

## License

GNU General Public License v3.0 
