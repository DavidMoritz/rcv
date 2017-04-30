# Steps with Ubuntu
**Note**: The `$` and `mysql>` portions within the commands are ***not*** part of the command, but are simply used to denote the difference between the bash prompt and the mysql CLI.

## Install MySQL
```
$ sudo apt-get install mysql-server
```

## Install PHP
```
$ sudo apt-get install php
```

## Create Database
The following steps are used to create a MySQL database using the MySQL CLI within Ubuntu. Run the below steps from the projects root directory where `Schema.sql` is located.

### Enter MySQL command line prompt
Typing the command below will prompt you for your password after you hit enter.
```
$ mysql -u root -p
```

Type your password then hit enter.

### Create the database
**Note** the difference in the command prompt.
```
mysql> source Schema.sql
```

### Confirm database creation
When executing the prior command you should have seen a series of output messages. Those were the result of creating the database, but to confirm that the database has been created, run:

```
mysql> SHOW DATABASES;
```

This should return to you something like this with our desired `rcv_db` created:
```
+--------------------+
| Database           |
+--------------------+
| information_schema |
| mysql              |
| performance_schema |
| rcv_db             |
| sys                |
+--------------------+
````

Your setup within the MySQL CLI is now complete! To exit the CLI, simply type `mysql> \q` and hit Enter.