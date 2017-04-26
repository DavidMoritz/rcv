# RCV - Ranked Choice Voting
This Ranked Choice Voting app is free to use, free to improve, and free to share with the general public!

Here are a few advantages to RCV:
* Better representation
* No “Settling”
* No wasted votes
* Vote by preference
* Great for multi-seat elections
* Easy to use

Ranked Choice voting is about representing the people in the best way possible. The key is allowing the voter to choose more than just their favorite candidate. The problem with only voting for one choice, is that if that choice does not come in first or second, it could be considered a “wasted vote.” Therefore, people are more likely to vote for their second or third choice on the idea that it has a higher chance of winning and it’s better than their last choice.

With Ranked Choice Voting, there is no issue with voting for your first choice first, second choice second, and third choice third. Because if your first choice doesn’t win, then your vote automatically gets transferred to your second choice! And that is the beauty of the system.

Another thing it works really well for voting for more than one position. Everyone’s vote is still counted as one vote, but if their first choice is elected, then a portion of their vote goes to second place. To better illustrate this point, there is a video that describes the use of ranked choice voting in the Animal Kingdom:

Click here to watch <https://youtu.be/l8XOZJkozfI>

## Consuming
This project is designed to create the files necessary to run the site from a PHP server with MySQL database (e.g. LAMP). The database can be externally located without any issue. Make sure you specify the location of the database in the *api/config.php* file.

The project uses Nodejs and Grunt to build a *dist/* folder whose contents will be copied into the root http folder of the server.

The following steps assume that you have Nodejs and Grunt-cli installed:

1) run `npm install`
2) create "api/config.php" from "api/config_sample.php"
3) input credentials to the MySQL database in config
4) use "Schema.sql" to build the MySQL database
5) run `grunt`
6) copy contents of dist/ to public_html/ on server

Let me know if you have any issues!

## Contributing

If you are interested in joining the cause and contributing, give me a shout @
