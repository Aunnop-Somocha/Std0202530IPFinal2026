-- phpMyAdmin SQL Dump
-- version 5.2.1deb3
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Oct 15, 2026 at 05:01 AM
-- Server version: 8.0.46-0ubuntu0.24.04.4
-- PHP Version: 8.3.6

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `ip_std6730202530`
--

-- --------------------------------------------------------

--
-- Table structure for table `AunSom_employees`
--

CREATE TABLE `AunSom_employees` (
  `id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `position` varchar(255) NOT NULL,
  `status` enum('Active','On Leave') NOT NULL DEFAULT 'Active',
  `salary` decimal(12,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `AunSom_employees`
--

INSERT INTO `AunSom_employees` (`id`, `name`, `position`, `status`, `salary`, `created_at`, `updated_at`) VALUES
(2, 'Jane Smith', 'HR Manager', 'On Leave', 52000.00, '2026-10-15 03:20:49', '2026-10-15 04:58:19'),
(3, 'Somchai Jaidee', 'Junior Frontend Developer', 'Active', 22000.00, '2026-10-15 03:20:49', '2026-10-15 03:20:49'),
(4, 'Somsri Rakdee', 'Administrative Assistant', 'On Leave', 18500.00, '2026-10-15 03:20:49', '2026-10-15 03:20:49'),
(5, 'Alice Johnson', 'VP of Engineering', 'Active', 95000.00, '2026-10-15 03:20:49', '2026-10-15 03:20:49'),
(6, 'Bob Williams', 'Senior System Architect', 'Active', 85000.00, '2026-10-15 03:20:49', '2026-10-15 03:20:49'),
(7, 'Kanya Wattana', 'Data Analyst', 'Active', 42000.00, '2026-10-15 03:20:49', '2026-10-15 03:20:49'),
(8, 'David Miller', 'DevOps Engineer', 'On Leave', 60000.00, '2026-10-15 03:20:49', '2026-10-15 03:20:49'),
(9, 'John Doe', 'Software Engineer', 'Active', 45000.00, '2026-10-15 03:57:23', '2026-10-15 03:57:23');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `AunSom_employees`
--
ALTER TABLE `AunSom_employees`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `AunSom_employees`
--
ALTER TABLE `AunSom_employees`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
