-- ========================================================
-- Table Structure and Initial Seed Data for HR Manager
-- Table Name: AunSom_employees
-- Database: ip_std6730202530
-- ========================================================

CREATE TABLE IF NOT EXISTS `AunSom_employees` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `position` VARCHAR(255) NOT NULL,
  `status` ENUM('Active', 'On Leave') NOT NULL DEFAULT 'Active',
  `salary` DECIMAL(12, 2) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================
-- Initial Mock Data (8 Employees for K-Means Clustering)
-- ========================================================

INSERT INTO `AunSom_employees` (`name`, `position`, `status`, `salary`) VALUES
('John Doe', 'Software Engineer', 'Active', 45000.00),
('Jane Smith', 'HR Manager', 'Active', 52000.00),
('Somchai Jaidee', 'Junior Frontend Developer', 'Active', 22000.00),
('Somsri Rakdee', 'Administrative Assistant', 'On Leave', 18500.00),
('Alice Johnson', 'VP of Engineering', 'Active', 95000.00),
('Bob Williams', 'Senior System Architect', 'Active', 85000.00),
('Kanya Wattana', 'Data Analyst', 'Active', 42000.00),
('David Miller', 'DevOps Engineer', 'On Leave', 60000.00);
