-- phpMyAdmin SQL Dump
-- version 4.0.10.18
-- https://www.phpmyadmin.net
--
-- Host: localhost:3306
-- Generation Time: Apr 25, 2017 at 04:45 PM
-- Server version: 5.6.28-76.1-log
-- PHP Version: 5.6.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

--
-- Database: `iptheate_rcv`
--
CREATE DATABASE IF NOT EXISTS `rcv_db` DEFAULT CHARACTER SET utf8 COLLATE utf8_general_ci;
USE `rcv_db`;

-- --------------------------------------------------------

--
-- Table structure for table `ballots`
--

DROP TABLE IF EXISTS `ballots`;
CREATE TABLE IF NOT EXISTS `ballots` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(64) NOT NULL,
  `key` varchar(16) NOT NULL,
  `positions` varchar(10) NOT NULL,
  `createdBy` varchar(64) NOT NULL,
  `requireSignIn` tinyint(1) NOT NULL,
  `tieBreak` varchar(16) NOT NULL,
  `maxVotes` smallint(6) NOT NULL,
  `voteCutoff` datetime NOT NULL,
  `resultsRelease` datetime NOT NULL,
  `timeCreated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;

-- --------------------------------------------------------

--
-- Table structure for table `entries`
--

DROP TABLE IF EXISTS `entries`;
CREATE TABLE IF NOT EXISTS `entries` (
  `ballotId` int(11) NOT NULL,
  `name` varchar(128) NOT NULL,
  `entry_id` int(11) NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`entry_id`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint(20) NOT NULL,
  `name` varchar(64) NOT NULL,
  `email` varchar(64) NOT NULL,
  `image` varchar(256) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `votes`
--

DROP TABLE IF EXISTS `votes`;
CREATE TABLE IF NOT EXISTS `votes` (
  `ballotId` int(11) NOT NULL,
  `vote` text NOT NULL,
  `ipAddress` varchar(64) NOT NULL,
  `vote_id` int(11) NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`vote_id`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;
