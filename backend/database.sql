-- ========================================================
-- Database Schema for HR Manager & Salary Analytics System
-- Database: ip_std6730202530
-- ========================================================

-- --------------------------------------------------------
-- 1. Table: AunSom_users (Authentication & Credentials)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `AunSom_users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(100) UNIQUE NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'admin',
  `name` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial Administrator Credentials (admin / password123)
INSERT INTO `AunSom_users` (`username`, `password`, `role`, `name`) VALUES
('admin', 'password123', 'admin', 'HR Administrator')
ON DUPLICATE KEY UPDATE `username`=`username`;

-- --------------------------------------------------------
-- 2. Table: AunSom_employees (Employee Management & Salary)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `AunSom_employees` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `position` VARCHAR(255) NOT NULL,
  `status` ENUM('Active', 'On Leave') NOT NULL DEFAULT 'Active',
  `salary` DECIMAL(12, 2) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial Mock Data (8 Employees for Phase 2 K-Means Clustering)
INSERT INTO `AunSom_employees` (`name`, `position`, `status`, `salary`) VALUES
('John Doe', 'Software Engineer', 'Active', 45000.00),
('Jane Smith', 'HR Manager', 'Active', 52000.00),
('Somchai Jaidee', 'Junior Frontend Developer', 'Active', 22000.00),
('Somsri Rakdee', 'Administrative Assistant', 'On Leave', 18500.00),
('Alice Johnson', 'VP of Engineering', 'Active', 95000.00),
('Bob Williams', 'Senior System Architect', 'Active', 85000.00),
('Kanya Wattana', 'Data Analyst', 'Active', 42000.00),
('David Miller', 'DevOps Engineer', 'On Leave', 60000.00);
