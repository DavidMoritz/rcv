# RCV - Ranked Choice Voting
This Ranked Choice Voting app is free to use, free to improve, and free to share with the general public!

Here are a few advantages to RCV:
* Better representation
* No “Settling”
* No wasted votes
* Vote by preference
* Great for multi-seat elections
* Easy to use

For a short, 1-minute explaination of RCV; check out this video: <https://youtu.be/oHRPMJmzBBw>

Ranked Choice voting is about representing the people in the best way possible. The key is allowing the voter to choose more than just their favorite candidate. The problem with only voting for one choice, is that if that choice does not come in first or second, it could be considered a “wasted vote.” Therefore, people are more likely to vote for their second or third choice on the idea that it has a higher chance of winning and it’s better than their last choice.

With Ranked Choice Voting, there is no issue with voting for your first choice first, second choice second, and third choice third. Because if your first choice doesn’t win, then your vote automatically gets transferred to your second choice! And that is the beauty of the system.

Another thing it works really well for voting for more than one position. Everyone’s vote is still counted as one vote, but if their first choice is elected, then a portion of their vote goes to second place. To better illustrate this point, there is a video that describes the use of ranked choice voting in the Animal Kingdom:

Click here to watch <https://youtu.be/l8XOZJkozfI>

## Consuming
This project is designed to create the files necessary to run the site from a PHP server with MySQL database (e.g. LAMP). The database can be externally located without any issue. Make sure you specify the location of the database in the *src/api/config.php* file.

The project uses Nodejs and Grunt to build a *dist/* folder whose contents will be copied into the root http folder of the server. If you don't have PHP or MySQL installed, please review <https://github.com/DavidMoritz/rcv/blob/master/UBUNTU.md>.

The following steps assume that you have PHP, MySQL, Nodejs and Grunt-cli installed and cwd is the project root:

1) run `npm install`
2) create "src/api/config.php" from "src/api/config_sample.php"
3) input your credentials to the MySQL database in "src/api/config.php"
4) use "Schema.sql" to build the MySQL database
5) run `grunt`
6) run `cd dist/`
7) run `php -S localhost:1337`
8) go to "localhost:1337" in your browser

Let me know if you have any issues!

## Docker Compose Consumption

The provided docker file is meant for development / getting up and running quickly.

1. create "src/api/config.php" from "src/api/config_sample.php" (make sure the MySQL location is "db" instead of "localhost")
2. Install docker and docker-compose; [Follow these instructions per your OS](https://docs.docker.com/compose/install/)
3. If you have docker compose installed cd to the project root and run `docker-compose up`
4. go to "localhost:1337" in your browser
5. profit

## Contributing

If you are interested in joining the cause and contributing, I am very appreciative! One area that I would like focused efforts on is the ability for someone to register and manage their different ballots. There was work toward this efforts, but not finished. Please contact me before putting in significant effort to avoid duplicate work. Thanks!
