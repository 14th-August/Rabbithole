# Rabbithole
Rabbithole is a Student Marketplace App designed for Vancouver Island University students who want to trade and re-sell textbooks, miscellaneous items, etc.

# Requirements
This project requires the following to run locally:
- Docker compose v2.2.1+

# Development
If using docker desktop you *must have the application open* for the below command to work.

The project Makefile provides a central entrypoint for interacting with the project.

To get started simply run:

1. `make env` to setup environment files
2. `make check-dev-env` to check if requisite scripts have necessary permissions
3. `make all` to spin up the development stack

or through the **Logs** tab in ***Docker Desktop***.

Once all containers have finished starting, you can access the web application at:
http://localhost:3000

This will take you to the sign-in page.

> Note: if you run into any issues with port 5000 on mac, [this stackoverflow post](https://stackoverflow.com/questions/72369320/why-always-something-is-running-at-port-5000-on-my-mac) may help.


## Next
- For API development, refer to the API [documentation](https://github.com/MGM-Interest-Group/mediform/blob/main/app/api/README.md)
- For Web development, refer to the Web [documentation](https://github.com/MGM-Interest-Group/mediform/blob/main/app/web/README.md)
- For Operations development, refer to the Operations [documentation](https://github.com/MGM-Interest-Group/mediform/blob/main/operations/README.md)
