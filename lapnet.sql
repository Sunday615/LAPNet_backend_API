-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Jan 29, 2026 at 08:41 AM
-- Server version: 9.5.0
-- PHP Version: 8.0.28

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `LAPNet`
--

-- --------------------------------------------------------

--
-- Table structure for table `announcement`
--

CREATE TABLE `announcement` (
  `idannouncement` int NOT NULL,
  `image` varchar(255) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `active` tinyint DEFAULT '0',
  `time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `timeforshow` int NOT NULL,
  `linkpath` varchar(255) DEFAULT NULL,
  `announcementcol` varchar(45) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `announcement`
--

INSERT INTO `announcement` (`idannouncement`, `image`, `title`, `description`, `active`, `time`, `timeforshow`, `linkpath`, `announcementcol`) VALUES
(17, '/uploads/announcement/announcement_1767716260994_378741554.png', 'ແຈ້ງການດ່ວນ', 'ແຈ້ງການດ່ວນ', 0, '2026-01-06 23:17:40', 3, NULL, NULL),
(18, '/uploads/announcement/announcement_1767749927867_639933220.png', 'Test Change edit', 'Test Change edit', 0, '2026-01-07 08:38:47', 3, 'https://www.bcel.com.la/bcel/home.html', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `announcements`
--

CREATE TABLE `announcements` (
  `id` bigint UNSIGNED NOT NULL,
  `title` varchar(140) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('draft','published','archived') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'published',
  `target_all` tinyint(1) NOT NULL DEFAULT '0',
  `collect_email` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `announcements`
--

INSERT INTO `announcements` (`id`, `title`, `body`, `status`, `target_all`, `collect_email`, `created_at`, `updated_at`) VALUES
(16, 'ທົດລອງ edit', 'Test pdf preview and insert', 'published', 0, 0, '2026-01-28 06:11:39', '2026-01-29 02:06:22');

-- --------------------------------------------------------

--
-- Table structure for table `announcement_attachments`
--

CREATE TABLE `announcement_attachments` (
  `id` bigint UNSIGNED NOT NULL,
  `announcement_id` bigint UNSIGNED NOT NULL,
  `original_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `stored_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `storage_path` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `size_bytes` bigint UNSIGNED NOT NULL DEFAULT '0',
  `checksum_sha256` char(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `announcement_attachments`
--

INSERT INTO `announcement_attachments` (`id`, `announcement_id`, `original_name`, `stored_name`, `storage_path`, `mime_type`, `size_bytes`, `checksum_sha256`, `created_at`) VALUES
(13, 16, '034 à»àº±àºàºªàº·à»àºà»àºàºàº°àºàº½àº¡àºàº§àº²àº¡àºà»àº­àº¡à»àºà»àºàºàºàº²àº àº¥àº²àº§-àº£àº±àºà»àºàº.pdf', 'ann_1769580699696_ab4691963b7a.pdf', '/uploads/announcementtomember/ann_1769580699696_ab4691963b7a.pdf', 'application/pdf', 4281269, NULL, '2026-01-28 06:11:39');

-- --------------------------------------------------------

--
-- Table structure for table `announcement_tags`
--

CREATE TABLE `announcement_tags` (
  `announcement_id` bigint UNSIGNED NOT NULL,
  `tag` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `announcement_tags`
--

INSERT INTO `announcement_tags` (`announcement_id`, `tag`) VALUES
(16, 'TEST_EDIT');

-- --------------------------------------------------------

--
-- Table structure for table `announcement_targets`
--

CREATE TABLE `announcement_targets` (
  `announcement_id` bigint UNSIGNED NOT NULL,
  `member_id` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `announcement_targets`
--

INSERT INTO `announcement_targets` (`announcement_id`, `member_id`) VALUES
(16, 'APB'),
(16, 'BCEL'),
(16, 'LDB'),
(16, 'LVB');

-- --------------------------------------------------------

--
-- Table structure for table `boarddirector`
--

CREATE TABLE `boarddirector` (
  `idboarddirector` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `role` varchar(255) NOT NULL,
  `profile` varchar(255) NOT NULL,
  `bankname` varchar(255) NOT NULL,
  `committee` varchar(255) NOT NULL,
  `createat` datetime DEFAULT NULL,
  `banklogo` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `boarddirector`
--

INSERT INTO `boarddirector` (`idboarddirector`, `name`, `role`, `profile`, `bankname`, `committee`, `createat`, `banklogo`) VALUES
(17, 'ທ່ານ ນັນທະລາດ ແກ້ວປະເສີດ', 'ຮອງຫົວໜ້າຄະນະກຳມະການຕິດຕາມການພັດທະນາລະບົບ', '/uploads/boarddirector/profile_1767931043444_7b476e44f385.webp', 'ທະນາຄານ ການຄ້າຕ່າງປະເທດລາວ ມະຫາຊົນ', 'ສະມາຊິກສະພາບໍລິຫານ', '2026-01-08 20:57:22', '/uploads/boarddirector/banklogo_1767931043058_84c6711e68e3.webp'),
(19, 'ທ່ານ ວຽງວິໄລ ແສງຄຳຢອງ', 'ຮອງຫົວໜ້າຄະນະກຳມະການຄຸ້ມຄອງຄວາມສ່ຽງ', '/uploads/boarddirector/profile_1767931416109_7cf345c9b3b5.webp', 'ທະນາຄານ ຮ່ວມທຸລະກິດລາວ-ຫວຽດ', 'ສະມາຊິກສະພາບໍລິຫານ', '2026-01-08 21:03:34', '/uploads/boarddirector/banklogo_1767931415700_a72ae284640b.webp'),
(20, 'ທ່ານ ຟີລິກ ດີຟຣານຊິສ', 'ຫົວໜ້າຄະນະກຳມະການຄຸ້ມຄອງຄວາມສ່ຽງ', '/uploads/boarddirector/profile_1767931476419_5aa95ffafb79.webp', 'ທະນາຄານ ບີໄອຊີ ລາວ ຈຳກັດ', 'ສະມາຊິກສະພາບໍລິຫານ', '2026-01-08 07:04:35', '/uploads/boarddirector/banklogo_1767931476086_2b0ff1c94e81.webp'),
(21, 'ທ່ານ ເອກະລາດ ລັດຕະນະຈານ', 'ຮອງຫົວໜ້າຄະນະກຳມະການຄົ້ນຄວ້ານະໂຍບາຍ', '/uploads/boarddirector/profile_1767931565418_bb9672a63e4f.webp', 'ທະນາຄານ ເອັສທີ ຈຳກັດ', 'ສະມາຊິກສະພາບໍລິຫານ', '2026-01-08 21:06:05', '/uploads/boarddirector/banklogo_1767931565178_b0d97f5590b8.webp'),
(22, 'ທ່ານ ຈັນຊະນະ ສິງຫາວົງ', 'ຫົວໜ້າຄະນະກຳມະການຄົ້ນຄວ້ານະໂຍບາຍ', '/uploads/boarddirector/profile_1767931610826_6de9e97f223e.webp', 'ທະນາຄານ ຮ່ວມພັດທະນາ ມະຫາຊົນ', 'ສະມາຊິກສະພາບໍລິຫານ', '2026-01-08 21:06:50', '/uploads/boarddirector/banklogo_1767931610513_8f7f10d57c95.webp'),
(23, 'ທ່ານ ສອນຕາວັນ ໄກສອນເສນາ', 'ຮອງຫົວໜ້າຄະນະກຳມະການກວດກາ', '/uploads/boarddirector/profile_1767931664319_8dd33aa5de36.webp', 'ທະນາຄານ ພັດທະນາລາວ ຈຳກັດ', 'ສະມາຊິກສະພາບໍລິຫານ', '2026-01-08 21:07:44', '/uploads/boarddirector/banklogo_1767931664177_020153b53964.webp'),
(24, 'ທ່ານ ສີສະອາດ ນຶມອາສາ', 'ຮອງຫົວໜ້າຄະນະກຳມະການກວດກາ', '/uploads/boarddirector/profile_1767931715228_e0089a312023.webp', 'ທະນາຄານ ສົ່ງເສີມກະສິກຳ ຈຳກັດ', 'ສະມາຊິກສະພາບໍລິຫານ', '2026-01-08 07:08:34', '/uploads/boarddirector/banklogo_1767931715048_25b25aecd2a1.webp'),
(25, 'ທ່ານ ນາງ CHU XUEMEI', 'ຫົວໜ້າຄະນະກຳມະການກວດກາ', '/uploads/boarddirector/profile_1767931760878_9efb75ea0a9f.webp', 'ບໍລິສັດ ຢູນຽນເພ ສາກົນ ຈຳກັດ', 'ສະມາຊິກສະພາບໍລິຫານ', '2026-01-08 07:09:20', '/uploads/boarddirector/banklogo_1767931760541_73bed32f23c0.webp'),
(26, 'ທ່ານ ນັນທະລາດ ແກ້ວປະເສີດ', 'ຮອງປະທານສະພາບໍລິຫານ', '/uploads/boarddirector/profile_1767931848841_c357b9011235.webp', 'ທະນາຄານ ການຄ້າຕ່າງປະເທດລາວ ມະຫາຊົນ', 'ຮອງປະທານສະພາບໍລິຫານ', '2026-01-08 21:10:48', '/uploads/boarddirector/banklogo_1767931848495_996989d507d7.webp'),
(27, 'ທ່ານ ມະໂນລິດ ຊຸມພົນພັກດີ', 'ປະທານສະພາບໍລິຫານ', '/uploads/boarddirector/profile_1767931885382_ae3ab353553d.webp', 'ທະນາຄານແຫ່ງ ສປປ ລາວ', 'ປະທານສະພາບໍລິຫານ', '2026-01-08 14:11:24', '/uploads/boarddirector/banklogo_1767931885026_232d24858261.webp'),
(28, 'ທ່ານ ຈັນຊະນະ ສິງຫາວົງ', 'ຫົວໜ້າຄະນະກຳມະການຕິດຕາມການພັດທະນາລະບົບ', '/uploads/boarddirector/profile_1768203871844_0d8e8349a9ac.webp', 'ທະນາຄານ ຮ່ວມພັດທະນາ ມະຫາຊົນ', 'ສະມາຊິກສະພາບໍລິຫານ', '2026-01-07 07:44:31', '/uploads/boarddirector/banklogo_1768203871551_718f8e5ed660.webp');

-- --------------------------------------------------------

--
-- Table structure for table `chat_conversations`
--

CREATE TABLE `chat_conversations` (
  `id` bigint UNSIGNED NOT NULL,
  `bankcode` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `chat_conversations`
--

INSERT INTO `chat_conversations` (`id`, `bankcode`, `created_at`, `updated_at`) VALUES
(1, 'KBANK', '2026-01-27 14:55:48', '2026-01-27 14:55:48'),
(25, 'APB', '2026-01-27 15:59:09', '2026-01-27 15:59:09'),
(26, 'BCEL', '2026-01-27 15:59:31', '2026-01-27 15:59:31'),
(29, 'JDB', '2026-01-27 16:12:30', '2026-01-27 16:12:30');

-- --------------------------------------------------------

--
-- Table structure for table `chat_messages`
--

CREATE TABLE `chat_messages` (
  `id` bigint UNSIGNED NOT NULL,
  `conversation_id` bigint UNSIGNED NOT NULL,
  `sender_role` enum('admin','bank') COLLATE utf8mb4_unicode_ci NOT NULL,
  `sender_bankcode` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `body` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `client_msg_id` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `delivered_at` datetime DEFAULT NULL,
  `read_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `chat_messages`
--

INSERT INTO `chat_messages` (`id`, `conversation_id`, `sender_role`, `sender_bankcode`, `body`, `client_msg_id`, `created_at`, `delivered_at`, `read_at`) VALUES
(1, 1, 'bank', 'KBANK', 'Hello ad min', '9156b3ae-6461-4854-abfb-e6fe555a1807', '2026-01-27 14:55:58', NULL, NULL),
(2, 1, 'admin', NULL, 'Hello bro!', '2ff62f1b-97e0-4bbc-872f-e4102626819f', '2026-01-27 15:04:11', NULL, NULL),
(3, 1, 'bank', 'KBANK', 'This is test message', '879e3fe4-a0aa-49e8-b09b-690e77ef4dab', '2026-01-27 15:10:20', NULL, NULL),
(4, 1, 'bank', 'KBANK', 'Test 1', '2c5f9b40-979d-4dff-aa75-6d12756fd744', '2026-01-27 15:26:32', NULL, NULL),
(5, 1, 'bank', 'KBANK', 'test 2', 'a52735f1-6c3f-48f9-a63b-0eafbd1a0dd9', '2026-01-27 15:26:33', NULL, NULL),
(6, 1, 'bank', 'KBANK', 'test 3', '51629231-94b8-4e0e-a224-a51bded6b215', '2026-01-27 15:26:35', NULL, NULL),
(7, 1, 'bank', 'KBANK', 'Hell', '1d9a15c8-3df5-4790-8767-5b86298d63ca', '2026-01-27 15:37:23', NULL, NULL),
(8, 26, 'bank', 'BCEL', 'Hello from BCEL', 'ce604270-fdef-4910-bd31-b360e02a2a38', '2026-01-27 16:00:00', NULL, NULL),
(9, 1, 'admin', NULL, 'Hello from ADMIN', 'bf7ef3a4-de96-4e89-a99e-5a1eaf9d2024', '2026-01-27 16:02:47', NULL, NULL),
(10, 1, 'bank', 'KBANK', 'Hello admin this is message from KBANK', 'db090794-43a9-41ff-a1aa-acc0956e4bab', '2026-01-27 16:07:07', NULL, NULL),
(11, 26, 'admin', NULL, 'Hello From ADMIN', '60b15c2d-8d86-4e15-b3e3-d665c96ff68e', '2026-01-27 16:08:07', NULL, NULL),
(12, 25, 'admin', NULL, 'Hello APB this is message from ADMIN', '0b7812b7-bfc1-43ab-84c4-9ca2db2d6e69', '2026-01-27 16:08:33', NULL, NULL),
(13, 29, 'bank', 'JDB', 'Hello admin this is message from JDB', '4748e1c9-c0e0-47e7-9897-72cdf8bc5fc2', '2026-01-27 16:12:40', NULL, NULL),
(14, 29, 'admin', NULL, 'Hello Message from Admin', 'e496c656-25de-42ee-bf8e-c98f059ff501', '2026-01-27 16:14:02', NULL, NULL),
(15, 29, 'bank', 'JDB', 'ສະບາຍດີ LAPNet', '408c2227-063f-4369-b213-ab583e0f0bd1', '2026-01-28 08:27:42', NULL, NULL),
(16, 26, 'bank', 'BCEL', 'ສະບາຍດີທີມງານ LAPNET', '2ca0fd9d-295f-455b-b4f2-b45c7fca454e', '2026-01-28 08:56:01', NULL, NULL),
(17, 26, 'bank', 'BCEL', 'Test message from BCEL', '5a1b8f9e-04fa-4767-bbea-b5c1e1efe016', '2026-01-28 15:50:08', NULL, NULL),
(18, 25, 'bank', 'APB', 'ສະບາຍດີທີມງານ Lapnet ນີ້ແມ່ນຂໍ້ຄວາມຈາກ APB', '6718e0d0-f981-41fa-850d-d734ab70fb35', '2026-01-29 08:45:49', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `documents`
--

CREATE TABLE `documents` (
  `id` bigint UNSIGNED NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('docs','excel','ppt','pdf','txt','other') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'other',
  `mime_type` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `size_bytes` bigint UNSIGNED NOT NULL DEFAULT '0',
  `owner` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `folder_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `storage_key` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `view_url` varchar(1024) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `download_url` varchar(1024) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `documents`
--

INSERT INTO `documents` (`id`, `name`, `type`, `mime_type`, `size_bytes`, `owner`, `folder_path`, `storage_key`, `view_url`, `download_url`, `description`, `is_deleted`, `deleted_at`, `created_at`, `updated_at`) VALUES
(1, 'Test aa', 'pdf', 'application/pdf', 921219, NULL, NULL, '1769066920668_81a09478c9056fb4.pdf', 'http://localhost:3000/uploads/documents/1769066920668_81a09478c9056fb4.pdf', 'http://localhost:3000/uploads/documents/1769066920668_81a09478c9056fb4.pdf', 'Test', 1, '2026-01-22 07:30:26', '2026-01-22 07:28:40', '2026-01-22 07:30:26'),
(2, 'ຮ່າງສັນຍາກັບ ສມຊ LMPS.docx', 'docs', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 46313, NULL, NULL, '1769067058867_c3da1b45ca7c2730.docx', 'http://localhost:3000/uploads/documents/1769067058867_c3da1b45ca7c2730.docx', 'http://localhost:3000/uploads/documents/1769067058867_c3da1b45ca7c2730.docx', 'ຮ່າງສັນຍາກັບ ສມຊ LMPS.docx', 0, NULL, '2026-01-22 07:30:58', '2026-01-22 07:30:58'),
(3, '02 ຮ່າງລະບຽບວ່າດ້ວຍການເປັນສະມາຊິກລະບົບບັດທະນາຄານຮ່ວມກັນ.pdf', 'pdf', 'application/pdf', 3884191, NULL, NULL, '1769067085691_65f990e08e779f0c.pdf', 'http://localhost:3000/uploads/documents/1769067085691_65f990e08e779f0c.pdf', 'http://localhost:3000/uploads/documents/1769067085691_65f990e08e779f0c.pdf', '02 ຮ່າງລະບຽບວ່າດ້ວຍການເປັນສະມາຊິກລະບົບບັດທະນາຄານຮ່ວມກັນ.pdf', 0, NULL, '2026-01-22 07:31:25', '2026-01-22 07:31:25'),
(4, '03 ຮ່າງຂໍ້ກຳນົດວ່າດ້ວຍຄ່າບໍລິການຂອງຜະລິດຕະພັນລະບົບບັດທະນາຄານຮ່ວມກັນ.pdf', 'pdf', 'application/pdf', 768353, NULL, NULL, '1769067195785_42355884df470e65.pdf', 'http://localhost:3000/uploads/documents/1769067195785_42355884df470e65.pdf', 'http://localhost:3000/uploads/documents/1769067195785_42355884df470e65.pdf', '03 ຮ່າງຂໍ້ກຳນົດວ່າດ້ວຍຄ່າບໍລິການຂອງຜະລິດຕະພັນລະບົບບັດທະນາຄານຮ່ວມກັນ.pdf', 0, NULL, '2026-01-22 07:33:15', '2026-01-22 07:33:15'),
(5, '004 ແຈ້ງການເປີດນຳໃຊ້ລະບົບແລະຍົກເວັ້ນຄ່າທຳນຽມຊຳລະ ລາວ-ຈີນ ສະມາຊິກ.pdf', 'pdf', 'application/pdf', 921219, NULL, NULL, '1769067207331_28e0f1050500f604.pdf', 'http://localhost:3000/uploads/documents/1769067207331_28e0f1050500f604.pdf', 'http://localhost:3000/uploads/documents/1769067207331_28e0f1050500f604.pdf', '004 ແຈ້ງການເປີດນຳໃຊ້ລະບົບແລະຍົກເວັ້ນຄ່າທຳນຽມຊຳລະ ລາວ-ຈີນ ສະມາຊິກ.pdf', 0, NULL, '2026-01-22 07:33:27', '2026-01-22 07:33:27'),
(6, '06. ຂໍ້ກຳນົດວ່າດ້ວຍຄ່າບໍລິການ ຜ່ານລະບົບ LMPS.pdf', 'pdf', 'application/pdf', 1075990, NULL, NULL, '1769067223699_c64a74e830341c69.pdf', 'http://localhost:3000/uploads/documents/1769067223699_c64a74e830341c69.pdf', 'http://localhost:3000/uploads/documents/1769067223699_c64a74e830341c69.pdf', '06. ຂໍ້ກຳນົດວ່າດ້ວຍຄ່າບໍລິການ ຜ່ານລະບົບ LMPS.pdf', 0, NULL, '2026-01-22 07:33:43', '2026-01-22 07:33:43'),
(7, '07 ຄຳແນະນຳກ່ຽວກັບການແກ້ໄຂທຸລະກຳຜິດພາດຂອງຜະລິດຕະພັນໂອນ-ຊຳລະຂ້າມທະນາຄານ.pdf', 'pdf', 'application/pdf', 3692396, NULL, NULL, '1769067247527_1335934bbfba8dd9.pdf', 'http://localhost:3000/uploads/documents/1769067247527_1335934bbfba8dd9.pdf', 'http://localhost:3000/uploads/documents/1769067247527_1335934bbfba8dd9.pdf', '07 ຄຳແນະນຳກ່ຽວກັບການແກ້ໄຂທຸລະກຳຜິດພາດຂອງຜະລິດຕະພັນໂອນ-ຊຳລະຂ້າມທະນາຄານ.pdf', 0, NULL, '2026-01-22 07:34:07', '2026-01-22 07:34:07'),
(8, '007 ແຈ້ງການຈັດຕັ້ງປະຕິບັດຕາມນິຕິກຳທີ່ຕິດພັນກັບລະບົບຊຳລະຂ້າມທະນາຄານເທິງມືຖື.pdf', 'pdf', 'application/pdf', 1451418, NULL, NULL, '1769067261875_c002dd9d28bc8fad.pdf', 'http://localhost:3000/uploads/documents/1769067261875_c002dd9d28bc8fad.pdf', 'http://localhost:3000/uploads/documents/1769067261875_c002dd9d28bc8fad.pdf', '007 ແຈ້ງການຈັດຕັ້ງປະຕິບັດຕາມນິຕິກຳທີ່ຕິດພັນກັບລະບົບຊຳລະຂ້າມທະນາຄານເທິງມືຖື.pdf', 0, NULL, '2026-01-22 07:34:21', '2026-01-22 07:34:21'),
(9, '08 ຂໍ້ກຳນົດ ວ່າດ້ວຍຄ່າບໍລິການລະບົບບັດທະນາຄານຮ່ວມກັນ ສະບັບເລກທີ 08 ລົງວັນທີ 29 ກໍລະກົດ', 'pdf', 'application/pdf', 1218728, NULL, NULL, '1769067283916_824c1ef355f2d15d.pdf', 'http://localhost:3000/uploads/documents/1769067283916_824c1ef355f2d15d.pdf', 'http://localhost:3000/uploads/documents/1769067283916_824c1ef355f2d15d.pdf', NULL, 0, NULL, '2026-01-22 07:34:43', '2026-01-22 07:34:43'),
(10, '10 ຄຳແນະນຳວ່າດ້ວຍການແກ້ໄຂທຸລະກຳຜິດພາດຂອງຜະລິດຕະພັນລະບົບບັດທະນາຄານຮ່ວມກັນ.pdf', 'pdf', 'application/pdf', 5758480, NULL, NULL, '1769067297298_0d78e22d001852a3.pdf', 'http://localhost:3000/uploads/documents/1769067297298_0d78e22d001852a3.pdf', 'http://localhost:3000/uploads/documents/1769067297298_0d78e22d001852a3.pdf', NULL, 0, NULL, '2026-01-22 07:34:57', '2026-01-22 07:34:57'),
(11, '53 ແຈ້ງການແກ້ໄຂທຸລະກຳທີ່ຜິດພາດຂອງລະບົບ LMPS.pdf', 'pdf', 'application/pdf', 4089498, NULL, NULL, '1769067311501_03e6e188361e93bc.pdf', 'http://localhost:3000/uploads/documents/1769067311501_03e6e188361e93bc.pdf', 'http://localhost:3000/uploads/documents/1769067311501_03e6e188361e93bc.pdf', '53 ແຈ້ງການແກ້ໄຂທຸລະກຳທີ່ຜິດພາດຂອງລະບົບ LMPS.pdf', 0, NULL, '2026-01-22 07:35:11', '2026-01-22 07:35:11'),
(12, '304 ແຈ້ງການຄ່າບໍລິການຜະລິດຕະພັນຊຳລະຂ້າມທະນາຄານດ້ວຍລະຫັດຄິວອາ.pdf', 'pdf', 'application/pdf', 675798, NULL, NULL, '1769067350068_60aa5084de61bc40.pdf', 'http://localhost:3000/uploads/documents/1769067350068_60aa5084de61bc40.pdf', 'http://localhost:3000/uploads/documents/1769067350068_60aa5084de61bc40.pdf', '304 ແຈ້ງການຄ່າບໍລິການຜະລິດຕະພັນຊຳລະຂ້າມທະນາຄານດ້ວຍລະຫັດຄິວອາ.pdf', 0, NULL, '2026-01-22 07:35:50', '2026-01-22 07:35:50'),
(13, '482 ລະບຽບວ່າດ້ວຍການຄູຸ້ມຄອງສະມາຊິກລະບົບຊຳລະຂ້າມທະນາຄານເທິງມືຖື', 'pdf', 'application/pdf', 15910384, NULL, NULL, '1769067372140_8916c3e68a86adc3.pdf', 'http://localhost:3000/uploads/documents/1769067372140_8916c3e68a86adc3.pdf', 'http://localhost:3000/uploads/documents/1769067372140_8916c3e68a86adc3.pdf', NULL, 0, NULL, '2026-01-22 07:36:12', '2026-01-22 07:36:12'),
(14, '484 ຂໍ້ກໍານົດ ວ່າດ້ວຍການໃຫ້ບໍລິການຜະລິດຕະພັນໂອນເງິນຂ້າມທະນາຄານ ແລະ ຜະລິດຕະພັນຊຳລະຂ້າມທະນາຄານ ຂອງລະບົບຊໍາລະຂ້າມທະນາຄານເທິງມືຖື.pdf', 'pdf', 'application/pdf', 10044615, NULL, NULL, '1769067433552_c8266a74878fbeb7.pdf', 'http://localhost:3000/uploads/documents/1769067433552_c8266a74878fbeb7.pdf', 'http://localhost:3000/uploads/documents/1769067433552_c8266a74878fbeb7.pdf', '484 ຂໍ້ກໍານົດ ວ່າດ້ວຍການໃຫ້ບໍລິການຜະລິດຕະພັນໂອນເງິນຂ້າມທະນາຄານ ແລະ ຜະລິດຕະພັນຊຳລະຂ້າມທະນາຄານ ຂອງລະບົບຊໍາລະຂ້າມທະນາຄານເທິງມືຖື.pdf', 0, NULL, '2026-01-22 07:37:13', '2026-01-22 07:37:13'),
(15, '486 ຂໍ້ກໍານົດວ່າດ້ວຍການໃຫ້ບໍລິການຜະລິດຕະພັນຊຳລະຂ້າມແດນຂອງລະບົບຊຳລະຂ້າມທະນາຄານເທິງມືຖື.pdf', 'pdf', 'application/pdf', 5735649, NULL, NULL, '1769067456935_89688227048c215a.pdf', 'http://localhost:3000/uploads/documents/1769067456935_89688227048c215a.pdf', 'http://localhost:3000/uploads/documents/1769067456935_89688227048c215a.pdf', '486 ຂໍ້ກໍານົດວ່າດ້ວຍການໃຫ້ບໍລິການຜະລິດຕະພັນຊຳລະຂ້າມແດນຂອງລະບົບຊຳລະຂ້າມທະນາຄານເທິງມືຖື.pdf', 0, NULL, '2026-01-22 07:37:36', '2026-01-22 07:37:36'),
(16, '487 ຂໍ້ກໍານົດວ່າດ້ວຍການໃຫ້ບໍລິການຜະລິດຕະພັນຊຳລະຂ້າມແດນລະຫວ່າງລາວ-ໄທ.pdf', 'pdf', 'application/pdf', 4755125, NULL, NULL, '1769067509326_dfcd14d91ff4bf3c.pdf', 'http://localhost:3000/uploads/documents/1769067509326_dfcd14d91ff4bf3c.pdf', 'http://localhost:3000/uploads/documents/1769067509326_dfcd14d91ff4bf3c.pdf', '487 ຂໍ້ກໍານົດວ່າດ້ວຍການໃຫ້ບໍລິການຜະລິດຕະພັນຊຳລະຂ້າມແດນລະຫວ່າງລາວ-ໄທ.pdf', 0, NULL, '2026-01-22 07:38:29', '2026-01-22 07:38:29'),
(17, 'Draft Agreement on the member of LMPS-LAP_VN.docx', 'docs', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 44658, NULL, NULL, '1769067553838_231887c1d5e090b2.docx', 'http://localhost:3000/uploads/documents/1769067553838_231887c1d5e090b2.docx', 'http://localhost:3000/uploads/documents/1769067553838_231887c1d5e090b2.docx', 'Draft Agreement on the member of LMPS-LAP_VN.docx', 0, NULL, '2026-01-22 07:39:13', '2026-01-22 07:39:13'),
(18, 'Draft Agreement on the member of LMPS-LAP_VN.docx', 'docs', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 44658, NULL, NULL, '1769067597233_0e0b8346f0ae26ec.docx', 'http://localhost:3000/uploads/documents/1769067597233_0e0b8346f0ae26ec.docx', 'http://localhost:3000/uploads/documents/1769067597233_0e0b8346f0ae26ec.docx', 'Draft Agreement on the member of LMPS-LAP_VN.docx', 0, NULL, '2026-01-22 07:39:57', '2026-01-22 07:39:57'),
(19, 'Draft Non-Disclosure Agreement-LAPNet.doc', 'docs', 'application/msword', 45056, NULL, NULL, '1769067616821_0a3bbbd44b32c1cd.doc', 'http://localhost:3000/uploads/documents/1769067616821_0a3bbbd44b32c1cd.doc', 'http://localhost:3000/uploads/documents/1769067616821_0a3bbbd44b32c1cd.doc', 'Draft Non-Disclosure Agreement-LAPNet.doc', 0, NULL, '2026-01-22 07:40:16', '2026-01-22 08:23:39'),
(20, 'LAO ATM POOL SWITCHING – ເອກະສານແນະນຳຂັ້ນຕອນສຳລັບການເຂົ້າເປັນສະມາຊິກຂອງລະບົບ LAPS.pdf', 'pdf', 'application/pdf', 490949, NULL, NULL, '1769067634972_3e2bac54318a2f11.pdf', 'http://localhost:3000/uploads/documents/1769067634972_3e2bac54318a2f11.pdf', 'http://localhost:3000/uploads/documents/1769067634972_3e2bac54318a2f11.pdf', 'LAO ATM POOL SWITCHING – ເອກະສານແນະນຳຂັ້ນຕອນສຳລັບການເຂົ້າເປັນສະມາຊິກຂອງລະບົບ LAPS.pdf', 0, NULL, '2026-01-22 07:40:34', '2026-01-22 07:40:34'),
(21, 'Letter of Confidentiality Commitment (LAPS) (1).doc', 'docs', 'application/msword', 40448, NULL, NULL, '1769067663454_8d0a101c081d28ed.doc', 'http://localhost:3000/uploads/documents/1769067663454_8d0a101c081d28ed.doc', 'http://localhost:3000/uploads/documents/1769067663454_8d0a101c081d28ed.doc', 'Letter of Confidentiality Commitment (LAPS) (1).doc', 0, NULL, '2026-01-22 07:41:03', '2026-01-22 07:41:03'),
(22, 'Letter of Confidentiality Commitment (lmps) .doc', 'docs', 'application/msword', 40960, NULL, NULL, '1769067681112_1c99097b6ed3727a.doc', 'http://localhost:3000/uploads/documents/1769067681112_1c99097b6ed3727a.doc', 'http://localhost:3000/uploads/documents/1769067681112_1c99097b6ed3727a.doc', 'Letter of Confidentiality Commitment (lmps) .doc', 0, NULL, '2026-01-22 07:41:21', '2026-01-22 08:23:27'),
(23, 'NDA LAPNet AND BOC.pdf', 'pdf', 'application/pdf', 925548, NULL, NULL, '1769067728111_6b042be35248374c.pdf', 'http://localhost:3000/uploads/documents/1769067728111_6b042be35248374c.pdf', 'http://localhost:3000/uploads/documents/1769067728111_6b042be35248374c.pdf', 'NDA LAPNet AND BOC.pdf', 0, NULL, '2026-01-22 07:42:08', '2026-01-22 07:42:08'),
(24, 'New Volume (D) - Shortcut.lnk', 'pdf', 'application/octet-stream', 543, NULL, NULL, '1769067740682_42a416326a29ab17.lnk', 'http://localhost:3000/uploads/documents/1769067740682_42a416326a29ab17.lnk', 'http://localhost:3000/uploads/documents/1769067740682_42a416326a29ab17.lnk', 'New Volume (D) - Shortcut.lnk', 0, NULL, '2026-01-22 07:42:20', '2026-01-22 07:42:20'),
(25, 'New Volume (D) - Shortcut.lnk', 'pdf', 'application/octet-stream', 543, NULL, NULL, '1769067751185_4038074dccc1b4fb.lnk', 'http://localhost:3000/uploads/documents/1769067751185_4038074dccc1b4fb.lnk', 'http://localhost:3000/uploads/documents/1769067751185_4038074dccc1b4fb.lnk', 'New Volume (D) - Shortcut.lnk', 0, NULL, '2026-01-22 07:42:31', '2026-01-22 07:42:31'),
(26, 'Non-Disclosure Agreement-LAPNet-THT cmts 02022023-.doc', 'docs', 'application/msword', 46592, NULL, NULL, '1769067763006_7c851bfd3a121db7.doc', 'http://localhost:3000/uploads/documents/1769067763006_7c851bfd3a121db7.doc', 'http://localhost:3000/uploads/documents/1769067763006_7c851bfd3a121db7.doc', 'Non-Disclosure Agreement-LAPNet-THT cmts 02022023-.doc', 0, NULL, '2026-01-22 07:42:43', '2026-01-23 08:41:59'),
(27, 'ຂັ້ນຕອນການຂໍເຂົ້າເປັນສະມາຊິກລະບົບ LMPS ສໍາລັບ ບໍລິສັດບັນດາ FinTech.docx', 'docs', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 25031, NULL, NULL, '1769067775216_71f675be84393299.docx', 'http://localhost:3000/uploads/documents/1769067775216_71f675be84393299.docx', 'http://localhost:3000/uploads/documents/1769067775216_71f675be84393299.docx', 'ຂັ້ນຕອນການຂໍເຂົ້າເປັນສະມາຊິກລະບົບ LMPS ສໍາລັບ ບໍລິສັດບັນດາ FinTech.docx', 0, NULL, '2026-01-22 07:42:55', '2026-01-23 08:42:14'),
(28, 'ຄັດຈ້ອນ ລະບຽບ ເງື່ອນໄຂ ການເຂົ້າເປັນສະມາຊິກທາງອ້ອມ ບໍລິສັດ LAPNet.pdf', 'pdf', 'application/pdf', 333190, NULL, NULL, '1769067805922_efc7a9ef60fb42d3.pdf', 'http://localhost:3000/uploads/documents/1769067805922_efc7a9ef60fb42d3.pdf', 'http://localhost:3000/uploads/documents/1769067805922_efc7a9ef60fb42d3.pdf', 'ຄັດຈ້ອນ ລະບຽບ ເງື່ອນໄຂ ການເຂົ້າເປັນສະມາຊິກທາງອ້ອມ ບໍລິສັດ LAPNet.pdf', 0, NULL, '2026-01-22 07:43:25', '2026-01-22 07:43:25'),
(29, 'ເງື່ອນໄຂ ການເຂົ້າເປັນສະມາຊິກບໍລິສັດ LAPNet ສຳລັບ Nonbank .pdf', 'pdf', 'application/pdf', 311686, NULL, NULL, '1769067892373_db851c94a05efcbe.pdf', 'http://localhost:3000/uploads/documents/1769067892373_db851c94a05efcbe.pdf', 'http://localhost:3000/uploads/documents/1769067892373_db851c94a05efcbe.pdf', 'ເງື່ອນໄຂ ການເຂົ້າເປັນສະມາຊິກບໍລິສັດ LAPNet ສຳລັບ Nonbank .pdf', 0, NULL, '2026-01-22 07:44:52', '2026-01-22 07:44:52'),
(30, 'ມາດຕາ 8 ການເຂົ້າເປັນສະມາຊິກ.PNG', 'pdf', 'image/png', 275523, NULL, NULL, '1769067919473_f72f0a333f3e501f.png', 'http://localhost:3000/uploads/documents/1769067919473_f72f0a333f3e501f.png', 'http://localhost:3000/uploads/documents/1769067919473_f72f0a333f3e501f.png', 'ມາດຕາ 8 ການເຂົ້າເປັນສະມາຊິກ.PNG', 0, NULL, '2026-01-22 07:45:19', '2026-01-22 07:45:19'),
(31, 'ເອກະສານຊ້ອນທ້າຍ 3 ຄຳແນະນຳກ່ຽວກັບລະບົບບັດທະນາຄານ ສະບັບເລກທີ 01ທຫລ ລົງວັນທີ 8 ທັນວາ 2017.pdf', 'pdf', 'application/pdf', 2201158, NULL, NULL, '1769067938471_db27f0b863bcc401.pdf', 'http://localhost:3000/uploads/documents/1769067938471_db27f0b863bcc401.pdf', 'http://localhost:3000/uploads/documents/1769067938471_db27f0b863bcc401.pdf', 'ເອກະສານຊ້ອນທ້າຍ 3 ຄຳແນະນຳກ່ຽວກັບລະບົບບັດທະນາຄານ ສະບັບເລກທີ 01ທຫລ ລົງວັນທີ 8 ທັນວາ 2017.pdf', 0, NULL, '2026-01-22 07:45:38', '2026-01-22 07:45:38'),
(32, 'Test', 'pdf', 'application/pdf', 5758480, NULL, NULL, '1769068771617_f2bda253cabcb41f.pdf', 'http://localhost:3000/uploads/documents/1769068771617_f2bda253cabcb41f.pdf', 'http://localhost:3000/uploads/documents/1769068771617_f2bda253cabcb41f.pdf', 'Test', 1, '2026-01-22 07:59:43', '2026-01-22 07:59:31', '2026-01-22 07:59:43'),
(33, 'TT', 'pdf', 'application/msword', 40448, NULL, NULL, '1769068801923_02e01bdb5fef6ffd.doc', 'http://localhost:3000/uploads/documents/1769068801923_02e01bdb5fef6ffd.doc', 'http://localhost:3000/uploads/documents/1769068801923_02e01bdb5fef6ffd.doc', 'TTT', 1, '2026-01-22 08:00:08', '2026-01-22 08:00:01', '2026-01-22 08:00:08'),
(34, 'Tee', 'pdf', 'image/jpeg', 6835, NULL, NULL, '1769134370040_c846fba6e63f9846.jpg', 'http://localhost:3000/uploads/documents/1769134370040_c846fba6e63f9846.jpg', 'http://localhost:3000/uploads/documents/1769134370040_c846fba6e63f9846.jpg', 'ttt', 0, NULL, '2026-01-23 02:12:50', '2026-01-23 02:12:50');

-- --------------------------------------------------------

--
-- Table structure for table `document_tags`
--

CREATE TABLE `document_tags` (
  `doc_id` bigint UNSIGNED NOT NULL,
  `tag` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `document_tags`
--

INSERT INTO `document_tags` (`doc_id`, `tag`, `created_at`) VALUES
(1, 'Test', '2026-01-22 07:28:40'),
(32, 'Test', '2026-01-22 07:59:31'),
(33, 'TTT', '2026-01-22 08:00:01'),
(34, 'tt', '2026-01-23 02:12:50');

-- --------------------------------------------------------

--
-- Table structure for table `emp_lapnet`
--

CREATE TABLE `emp_lapnet` (
  `emp_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `role` varchar(255) NOT NULL,
  `department` varchar(45) NOT NULL,
  `position` varchar(45) NOT NULL,
  `create_at` datetime NOT NULL,
  `imageprofile` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `emp_lapnet`
--

INSERT INTO `emp_lapnet` (`emp_id`, `name`, `role`, `department`, `position`, `create_at`, `imageprofile`) VALUES
(7, 'ກວດສອບພາຍໃນ', 'Internal Audit', 'Internal Audit', 'ວິຊາການ', '2026-01-07 13:24:29', '/uploads/emp_lapnet/empimg_1768188269166_ea7c16b91195.webp'),
(8, 'ທ່ານ ນາງ ນ້ຳທິບພະກອນ ວໍລະລາດ', 'ກວດສອບພາຍໃນ', 'Internal Audit', 'ວິຊາການ', '2026-01-09 06:45:17', '/uploads/emp_lapnet/empimg_1767941117743_ca9c27d0e42c.webp'),
(9, 'ທ່ານ ນາງ ດາລີວັນ ຈັນທະລັງສີ', 'ກວດສອບພາຍໃນ', 'Internal Audit', 'ວິຊາການ', '2026-01-09 06:45:43', '/uploads/emp_lapnet/empimg_1767941143202_4973b392367b.webp'),
(10, 'ທ່ານ ນາງ ໂດລີ້ ທິດປັນຍາ', 'ດໍາເນີນງານ – ຄວາມສ່ຽງ', 'Operation', 'ວິຊາການ', '2026-01-09 06:48:12', '/uploads/emp_lapnet/empimg_1767941292949_a5c231c567b1.webp'),
(11, 'ທ່ານ ນາງ ສຸກຂີຕາ ມະນີບົດ', 'ດໍາເນີນງານ – ໄລ່ລຽງ ແລະ ຫັກບັນຊີ', 'Operation', 'ວິຊາການ', '2026-01-09 06:48:29', '/uploads/emp_lapnet/empimg_1767941309941_0ad147749481.webp'),
(12, 'ທ່ານ ສົມສະໄໝ ຂັນທະວົງ', 'ດໍາເນີນງານ – ສະໜັບສະໜູນ', 'Operation', 'ວິຊາການ', '2026-01-09 06:48:49', '/uploads/emp_lapnet/empimg_1767941329060_a01aaf418bd5.webp'),
(13, 'ທ່ານ ອານຸໄຊ ສີວິໄລ', 'ດໍາເນີນງານ – ສະໜັບສະໜູນ', 'Operation', 'ວິຊາການ', '2026-01-09 06:49:26', '/uploads/emp_lapnet/empimg_1767941366024_42ba71401f8e.webp'),
(14, 'ທ່ານ ນາງ ວິດາລັດ ທຳມະວົງ', 'ດໍາເນີນງານ – ໄລ່ລຽງ ແລະ ຫັກບັນຊີ', 'Operation', 'ວິຊາການ', '2026-01-09 06:49:48', '/uploads/emp_lapnet/empimg_1767941388286_cfd4b18ed01d.webp'),
(15, 'ທ່ານ ນາງ ວາຢູລີ ຈວງຈິນດາ', 'ດໍາເນີນງານ – ສະໜັບສະໜູນ', 'Operation', 'ວິຊາການ', '2026-01-09 06:50:09', '/uploads/emp_lapnet/empimg_1767941409428_4dfd71314afc.webp'),
(16, 'ທ່ານ ນາງ ປີດາ ສີຫາລາດ', 'ການຕະຫຼາດ', 'Operation', 'ວິຊາການ', '2026-01-09 06:50:24', '/uploads/emp_lapnet/empimg_1767941424718_8e53ef75a6ef.webp'),
(17, 'ທ່ານ ເດດມີໄຊ ວັນນະຈິດ', 'ຫົວໜ້າພະແນກດໍາເນີນງານ', 'Operation', 'ຫົວຫນ້າພະແນກ', '2026-01-09 06:50:41', '/uploads/emp_lapnet/empimg_1767941442029_99427faecc2e.webp'),
(18, 'ທ່ານ ອານຸພົງ ເທບວົງສາ', 'ຄຸ້ມຄອງ ແລະ ພັດທະນາຊັອບແວຣ໌', 'IT', 'ວິຊາການ', '2026-01-09 06:51:36', '/uploads/emp_lapnet/empimg_1767941496254_a0f80e8ec1a4.webp'),
(19, 'ທ່ານ ວັນຊະນະ ວັນນະລົງ', 'ຄຸ້ມຄອງລະບົບເຄືອຂ່າຍ ແລະ ຄວາມປອດໄພ', 'IT', 'ວິຊາການ', '2026-01-09 06:51:54', '/uploads/emp_lapnet/empimg_1767941514454_83e002243e82.webp'),
(20, 'ທ່ານ ຟອງສະໝຸດ ວັນນິວົງຄຳ', 'ຄຸ້ມຄອງລະບົບໂຄງຮ່າງພື້ນຖານໄອທີ', 'IT', 'ວິຊາການ', '2026-01-09 06:52:13', '/uploads/emp_lapnet/empimg_1767941533537_576c8794d5e6.webp'),
(21, 'ທ່ານ ນາງ ມາຄະວະດີ ກັນນິຖາ', 'ຄຸ້ມຄອງລະບົບເຄືອຂ່າຍ ແລະ ຄວາມປອດໄພ', 'IT', 'ວິຊາການ', '2026-01-09 06:52:35', '/uploads/emp_lapnet/empimg_1767941555352_aaf207c6dbc3.webp'),
(22, 'ທ່ານ ເອັງຊົງ ເຢັງຊືນູ', 'ຄຸ້ມຄອງ ແລະ ພັດທະນາຊັອບແວຣ໌', 'IT', 'ວິຊາການ', '2026-01-09 06:52:53', '/uploads/emp_lapnet/empimg_1767941573879_b11e3a280e93.webp'),
(23, 'ທ່ານ ສຸກສະຫວັນ ນາມມະວົງ', 'ຄຸ້ມຄອງລະບົບໂຄງຮ່າງພື້ນຖານໄອທີ', 'IT', 'ວິຊາການ', '2026-01-09 06:53:14', '/uploads/emp_lapnet/empimg_1767941594169_781f3501dd96.webp'),
(24, 'ທ່ານ ພູເຂົາທອງ ເມືອງວົງ', 'ຫົວໜ້າພະແນກໄອທີ', 'IT', 'ຫົວຫນ້າພະແນກ', '2026-01-09 06:53:33', '/uploads/emp_lapnet/empimg_1767941613850_4bcd15787454.webp'),
(25, 'ທ່ານ ນາງ ຄູນສະຫວັນ ລຳລະໄມ', 'ການເງິນທົ່ວໄປ', 'Finance & Accounting', 'ວິຊາການ', '2026-01-09 06:54:39', '/uploads/emp_lapnet/empimg_1767941679296_576940f67d28.webp'),
(26, 'ທ່ານ ນາງ ປາເອ້ຍເຮີ່ ຈົ່ງລື', 'ການເງິນວິເຄາະ', 'Finance & Accounting', 'ວິຊາການ', '2026-01-09 06:54:58', '/uploads/emp_lapnet/empimg_1767941698047_64d64397cea8.webp'),
(27, 'ທ່ານ ຄູນມີ ລັດຕະນະເຮືອງສີ', 'ບັນຊີ', 'Finance & Accounting', 'ວິຊາການ', '2026-01-09 06:55:15', '/uploads/emp_lapnet/empimg_1767941715043_3b464d2d31ab.webp'),
(28, 'ທ່ານ ວັດທະນາ ວໍລະບຸດ', 'ຫົວໜ້າພະແນກບັນຊີ ແລະ ການເງິນ', 'Finance & Accounting', 'ຫົວຫນ້າພະແນກ', '2026-01-09 06:55:36', '/uploads/emp_lapnet/empimg_1767941736493_af6b1413511a.webp'),
(29, 'ທ່ານ ນາງ ດາລີນີ ນວນສະຫວັນ', 'ບຸກຄະລາກອນ', 'Administration', 'ວິຊາການ', '2026-01-09 06:56:26', '/uploads/emp_lapnet/empimg_1767941786256_fbb82ae34c74.webp'),
(30, 'ທ່ານ ນາງ ປານັດດາ ດວງທອງຄຳ', 'ເລຂານຸການ', 'Administration', 'ວິຊາການ', '2026-01-09 06:56:41', '/uploads/emp_lapnet/empimg_1767941801695_4bff0409c7d3.webp'),
(31, 'ທ່ານ ນາງ ໂພເງິນ ສີສະຫວັດ', 'ນິຕິກຳ', 'Administration', 'ວິຊາການ', '2026-01-09 06:56:56', '/uploads/emp_lapnet/empimg_1767941816849_f2bfc52ed238.webp'),
(32, 'ທ່ານ ສຸກທະວີ ນຳມະນີວົງ', 'ບໍລິຫານ–ສັງລວມ', 'Administration', 'ວິຊາການ', '2026-01-09 06:57:14', '/uploads/emp_lapnet/empimg_1767941834108_f7e08a1b3b82.webp'),
(33, 'ທ່ານ ນາງ ອາລີພອນ ເພັງສະຫວັດດີ', 'ຮອງຫົວໜ້າພະແນກຫ້ອງການ', 'Administration', 'ຮອງຫົວໜ້າພະແນກ', '2026-01-09 06:57:51', '/uploads/emp_lapnet/empimg_1767941871293_ecbf372d2191.webp'),
(34, 'ທ່ານ ສັນຕິພາບ ປານມະໄລທອງ', 'ຫົວໜ້າພະແນກຫ້ອງການ', 'Administration', 'ຫົວຫນ້າພະແນກ', '2026-01-09 06:58:12', '/uploads/emp_lapnet/empimg_1767941892436_65dbd8caa270.webp'),
(35, 'ທ່ານ ນາງ ນີວະສອນ ມາລາທິບ', 'ຮອງຜູ້ອຳນວຍການ', 'COO', 'ຮອງຜູ້ອຳນວຍການ', '2026-01-08 23:58:57', '/uploads/emp_lapnet/empimg_1767941937390_46688bc1c1b9.webp'),
(36, 'ທ່ານ ສີສະໝອນ ສຣິດທິຣາດ', 'ຜູ້ອຳນວຍການ', 'CEO', 'ຜູ້ອຳນວຍການ', '2026-01-09 06:59:16', '/uploads/emp_lapnet/empimg_1767941956427_c830ae210cb5.webp');

-- --------------------------------------------------------

--
-- Table structure for table `form_submissions`
--

CREATE TABLE `form_submissions` (
  `id` bigint UNSIGNED NOT NULL,
  `template_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `source_form_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `answers` json NOT NULL,
  `submitted_at` datetime(3) NOT NULL,
  `ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `bankcode` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `form_submissions`
--

INSERT INTO `form_submissions` (`id`, `template_id`, `source_form_id`, `email`, `answers`, `submitted_at`, `ip`, `user_agent`, `created_at`, `updated_at`, `bankcode`) VALUES
(10, '265', '1769657274347399', 'BCEL@gmail.com', '{\"__email\": \"BCEL@gmail.com\", \"q_4ad45f6816fb5_1769657184727\": {\"0\": [0, 1], \"1\": [0], \"2\": [1]}, \"q_4f83c84fa271f_1769656745904\": 5, \"q_602a1b4a0fd65_1769656387883\": \"ທະນາຄານການຄ້າ\", \"q_78f2d139d039f_1769657249261\": \"2026-01-13\", \"q_84095933ea06a_1769657258561\": \"13:31\", \"q_c45ecb04a39b6_1769656615659\": [\"Saving Account\", \"Current Account\", \"Loan\", \"Credit card\"], \"q_d0d986c928ca7_1769656576752\": \"ອື່ນໆ\", \"q_d8c9882b788bc_1769656666953\": \"Main Branch\", \"q_6eca7b1fa2bfa8_1769657026325\": {\"0\": 2, \"1\": 2, \"2\": 1}, \"q_708a3dab3b4288_1769656729537\": {\"name\": \"1_BCEL.png\", \"size\": 1175232, \"type\": \"image/png\", \"field\": \"file_q_708a3dab3b4288_1769656729537\"}, \"q_8e8807f40e1b28_1769656537119\": \"ບ້ານຊຽງຢືນ\"}', '2026-01-29 10:31:21.168', '::1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36', '2026-01-29 03:31:21.229', '2026-01-29 03:31:21.229', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `form_submission_files`
--

CREATE TABLE `form_submission_files` (
  `id` bigint UNSIGNED NOT NULL,
  `submission_id` bigint UNSIGNED NOT NULL,
  `question_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `field_name` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `size_bytes` bigint UNSIGNED NOT NULL DEFAULT '0',
  `storage_driver` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'local',
  `storage_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `form_submission_files`
--

INSERT INTO `form_submission_files` (`id`, `submission_id`, `question_id`, `field_name`, `original_name`, `mime_type`, `size_bytes`, `storage_driver`, `storage_path`, `created_at`) VALUES
(7, 10, 'q_708a3dab3b4288_1769656729537', 'file_q_708a3dab3b4288_1769656729537', '1_BCEL.png', 'image/png', 1175232, 'local', 'uploads/submit_assets/10/q_708a3dab3b4288_1769656729537_1769657481245_ca51a0fd7dd7.png', '2026-01-29 03:31:21.248');

-- --------------------------------------------------------

--
-- Table structure for table `form_templates`
--

CREATE TABLE `form_templates` (
  `id` bigint UNSIGNED NOT NULL,
  `source_form_id` bigint UNSIGNED NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  `payload` json NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `activetoggle` tinyint(1) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `form_templates`
--

INSERT INTO `form_templates` (`id`, `source_form_id`, `name`, `note`, `payload`, `created_at`, `updated_at`, `activetoggle`) VALUES
(265, 1769657274347399, 'ທົດສອບການສ້າງ Forms', '', '{\"meta\": {\"title\": \"ທົດສອບການສ້າງ Forms\", \"description\": \"ທົດລອງສ້າງ form ສຳລັບທະນາຄານສະມາຊິກ\", \"collectEmail\": true, \"allowEditAfterSubmit\": false}, \"questions\": [{\"id\": \"q_602a1b4a0fd65_1769656387883\", \"type\": \"short\", \"title\": \"ຊື່ທະນາຄານ\", \"images\": [], \"options\": [], \"gridCols\": [], \"gridRows\": [], \"maxFiles\": 1, \"required\": true, \"scoreMax\": 5, \"fileTypes\": [], \"maxSizeMB\": 10, \"scoreIcon\": \"star\", \"sort_order\": 1, \"description\": \"\", \"uploadPreviewFiles\": [], \"uploadRestrictEnabled\": false}, {\"id\": \"q_8e8807f40e1b28_1769656537119\", \"type\": \"long\", \"title\": \"ທີ່ຢູ່\", \"images\": [], \"options\": [], \"gridCols\": [], \"gridRows\": [], \"maxFiles\": 1, \"required\": false, \"scoreMax\": 5, \"fileTypes\": [], \"maxSizeMB\": 10, \"scoreIcon\": \"star\", \"sort_order\": 2, \"description\": \"\", \"uploadPreviewFiles\": [], \"uploadRestrictEnabled\": false}, {\"id\": \"q_d0d986c928ca7_1769656576752\", \"type\": \"option\", \"title\": \"ເພດ\", \"images\": [], \"options\": [\"ຜູ້ຊາຍ\", \"ຜູ້ຫຍິງ\", \"ອື່ນໆ\"], \"gridCols\": [], \"gridRows\": [], \"maxFiles\": 1, \"required\": false, \"scoreMax\": 5, \"fileTypes\": [], \"maxSizeMB\": 10, \"scoreIcon\": \"star\", \"sort_order\": 3, \"description\": \"\", \"uploadPreviewFiles\": [], \"uploadRestrictEnabled\": false}, {\"id\": \"q_c45ecb04a39b6_1769656615659\", \"type\": \"checkbox\", \"title\": \"ບໍລິການຂອງທະນາຄານສະມາຊິກ\", \"images\": [], \"options\": [\"Saving Account\", \"Current Account\", \"Loan\", \"Credit card\"], \"gridCols\": [], \"gridRows\": [], \"maxFiles\": 1, \"required\": false, \"scoreMax\": 5, \"fileTypes\": [], \"maxSizeMB\": 10, \"scoreIcon\": \"star\", \"sort_order\": 4, \"description\": \"\", \"uploadPreviewFiles\": [], \"uploadRestrictEnabled\": false}, {\"id\": \"q_d8c9882b788bc_1769656666953\", \"type\": \"dropdown\", \"title\": \"ເລຶອກປະເພດທະນາຄານ\", \"images\": [], \"options\": [\"Main Branch\", \"City Branch\", \"Rural Branch\", \"Other\"], \"gridCols\": [], \"gridRows\": [], \"maxFiles\": 1, \"required\": false, \"scoreMax\": 5, \"fileTypes\": [], \"maxSizeMB\": 10, \"scoreIcon\": \"star\", \"sort_order\": 5, \"description\": \"\", \"uploadPreviewFiles\": [], \"uploadRestrictEnabled\": false}, {\"id\": \"q_708a3dab3b4288_1769656729537\", \"type\": \"upload\", \"title\": \"Upload Your Logo\", \"images\": [], \"options\": [], \"gridCols\": [], \"gridRows\": [], \"maxFiles\": 1, \"required\": false, \"scoreMax\": 5, \"fileTypes\": [\"image\", \"pdf\"], \"maxSizeMB\": 10, \"scoreIcon\": \"star\", \"sort_order\": 6, \"description\": \"\", \"uploadPreviewFiles\": [], \"uploadRestrictEnabled\": false}, {\"id\": \"q_4f83c84fa271f_1769656745904\", \"type\": \"score\", \"title\": \"ຄວາມພຶງພໍໃຈ\", \"images\": [], \"options\": [], \"gridCols\": [], \"gridRows\": [], \"maxFiles\": 1, \"required\": false, \"scoreMax\": 5, \"fileTypes\": [], \"maxSizeMB\": 10, \"scoreIcon\": \"star\", \"sort_order\": 7, \"description\": \"1 : ໜ່ອຍສຸດ | 5 : ຫຼາຍສຸດ\", \"uploadPreviewFiles\": [], \"uploadRestrictEnabled\": false}, {\"id\": \"q_6eca7b1fa2bfa8_1769657026325\", \"type\": \"table_option\", \"title\": \"Rate the follwing services\", \"images\": [], \"options\": [], \"gridCols\": [\"Poor\", \"Average\", \"Excellent\"], \"gridRows\": [\"Customer Support\", \"Online Banking\", \"Loan Services\"], \"maxFiles\": 1, \"required\": false, \"scoreMax\": 5, \"fileTypes\": [], \"maxSizeMB\": 10, \"scoreIcon\": \"star\", \"sort_order\": 8, \"description\": \"\", \"uploadPreviewFiles\": [], \"uploadRestrictEnabled\": false}, {\"id\": \"q_4ad45f6816fb5_1769657184727\", \"type\": \"table_checkbox\", \"title\": \"Which service are your branch?\", \"images\": [], \"options\": [], \"gridCols\": [\"Available\", \"Not Available\"], \"gridRows\": [\"ATM\", \"Cash Deposit\", \"Account Opening\"], \"maxFiles\": 1, \"required\": false, \"scoreMax\": 5, \"fileTypes\": [], \"maxSizeMB\": 10, \"scoreIcon\": \"star\", \"sort_order\": 9, \"description\": \"\", \"uploadPreviewFiles\": [], \"uploadRestrictEnabled\": false}, {\"id\": \"q_78f2d139d039f_1769657249261\", \"type\": \"date\", \"title\": \"Date of birth\", \"images\": [], \"options\": [], \"gridCols\": [], \"gridRows\": [], \"maxFiles\": 1, \"required\": false, \"scoreMax\": 5, \"fileTypes\": [], \"maxSizeMB\": 10, \"scoreIcon\": \"star\", \"sort_order\": 10, \"description\": \"\", \"uploadPreviewFiles\": [], \"uploadRestrictEnabled\": false}, {\"id\": \"q_84095933ea06a_1769657258561\", \"type\": \"time\", \"title\": \"Visit Time\", \"images\": [], \"options\": [], \"gridCols\": [], \"gridRows\": [], \"maxFiles\": 1, \"required\": false, \"scoreMax\": 5, \"fileTypes\": [], \"maxSizeMB\": 10, \"scoreIcon\": \"star\", \"sort_order\": 11, \"description\": \"\", \"uploadPreviewFiles\": [], \"uploadRestrictEnabled\": false}]}', '2026-01-29 03:27:54', '2026-01-29 03:28:04', 1);

-- --------------------------------------------------------

--
-- Table structure for table `form_template_assets`
--

CREATE TABLE `form_template_assets` (
  `id` bigint UNSIGNED NOT NULL,
  `template_id` bigint UNSIGNED NOT NULL,
  `source_form_id` bigint UNSIGNED NOT NULL,
  `question_id` varchar(100) NOT NULL,
  `image_id` varchar(120) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `mime` varchar(64) NOT NULL DEFAULT 'image/webp',
  `size_bytes` int UNSIGNED NOT NULL DEFAULT '0',
  `rel_path` varchar(600) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `jobs_list`
--

CREATE TABLE `jobs_list` (
  `job_id` int NOT NULL,
  `department` varchar(45) NOT NULL,
  `levels` varchar(45) NOT NULL,
  `time` datetime NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `features` json NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `jobs_list`
--

INSERT INTO `jobs_list` (`job_id`, `department`, `levels`, `time`, `title`, `features`, `active`) VALUES
(4, 'Other', 'Intern', '2026-01-05 10:30:59', 'ຮັບສະໝັກນັກສຶກສາຝືກງານ', '{\"items\": [\"ສາມາດເຮັດວຽກທີໄດ້ຮັບມອບໝາຍ Front end back end , Full stack\", \"ເັຮດວຽກພາຍໃຕ້ແຮງກົດດັນ\"], \"heading\": \"ຕ້ອງການຕຄົນທີ່ຕ້ອງການຮຽນຮູ້ຕະຫຼອດເວລາ\"}', 0),
(5, 'IT', 'Senior', '2026-01-05 11:16:46', 'Frontend Developer', '{\"items\": [\"UX UIll\", \"New test\"], \"heading\": \"ຕ້ອງການພະນັກງານ\"}', 0),
(6, 'IT', 'Mid', '2026-01-05 11:18:29', 'Frontend Developer', '{\"items\": [\"FG\"], \"heading\": \"This is test part\"}', 0),
(7, 'Operation', 'Mid', '2026-01-07 10:00:24', 'This is test edit', '{\"items\": [\"Test edit bro!\", \"dsfds\"], \"heading\": \"Test edit bro!lllllll\"}', 0),
(10, 'Other', 'Intern', '2026-01-23 11:32:57', 'ຮັບສະໝັກນັກສຶກສາຝືກງານ', '{\"items\": [\"ນັກສຶກສາ\"], \"heading\": \"LAPNet ຕ້ອງການນັກສຶກສາຝືກງານ\"}', 0);

-- --------------------------------------------------------

--
-- Table structure for table `members`
--

CREATE TABLE `members` (
  `idmember` int NOT NULL,
  `Bankcode` varchar(45) NOT NULL,
  `BanknameLA` varchar(255) NOT NULL,
  `BanknameEN` varchar(255) NOT NULL,
  `Color` json NOT NULL,
  `LinkFB` varchar(255) NOT NULL,
  `LinkWeb` varchar(255) NOT NULL,
  `CardATM` json DEFAULT NULL,
  `Mbbankking` json DEFAULT NULL,
  `Crossborder` json DEFAULT NULL,
  `image` varchar(255) NOT NULL,
  `time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `memberATM` tinyint(1) DEFAULT '0',
  `membermobile` tinyint(1) DEFAULT '0',
  `membercrossborder` tinyint(1) DEFAULT '0',
  `atminquery` tinyint(1) DEFAULT '0',
  `atmcashwithdraw` tinyint(1) DEFAULT '0',
  `atmtransfer` tinyint(1) DEFAULT '0',
  `mobiletransfer` tinyint(1) DEFAULT '0',
  `qrpayment` tinyint(1) DEFAULT '0',
  `crossborderproduct` tinyint(1) DEFAULT '0',
  `fintech` tinyint(1) DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `members`
--

INSERT INTO `members` (`idmember`, `Bankcode`, `BanknameLA`, `BanknameEN`, `Color`, `LinkFB`, `LinkWeb`, `CardATM`, `Mbbankking`, `Crossborder`, `image`, `time`, `memberATM`, `membermobile`, `membercrossborder`, `atminquery`, `atmcashwithdraw`, `atmtransfer`, `mobiletransfer`, `qrpayment`, `crossborderproduct`, `fintech`) VALUES
(1, 'BCEL', 'ທະນາຄານ ການຄ້າຕ່າງປະເທດລາວ ມະຫາຊົນ (BCEL)', 'Banque Pour Le Commerce Exterieur Lao Public', '{\"primary\": \"#cb0202\", \"secondary\": \"#520000\"}', 'https://www.facebook.com/BCEL.Bank', 'https://www.bcel.com.la', '{\"items\": [\"ກວດສອບຍອດເງິນຂ້າມທະນາຄານຜ່ານຕູ້ ATM\", \"ໂອນເງິນຂ້າມທະນາຄານຜ່ານຕູ້ ATM\", \"ໂອນເງິນຂ້າມທະນາຄານຜ່ານໂທລະສັບດ້ວຍເລກໜ້າບັດ\", \"ຖອນເງິນສົດຂ້າມທະນາຄານຜ່ານຕູ້ ATM\"]}', '{\"items\": [\"ໂອນເງິນຂ້າມທະນາຄານເທິງມືຖືນຳໃຊ້ເລກບັນຊີ\", \"ໂອນເງິນຂ້າມທະນາຄານຜ່ານ QR CODE\", \"ຊຳລະຄ່າສິນຄ້າ ແລະ ບໍລິການ ໂດຍສະແກນ QR CODE\"]}', '{\"items\": [\"ກຳປູເຈຍ ສະແກນ ລາວ\", \"ລາວ ສະແກນ ກຳປູເຈຍ\", \"ໄທ ສະແກນ ລາວ\", \"ລາວ ສະແກນ ໄທ\", \"ຈີນ ສະແກນ ລາວ\", \"ຫວຽດນາມ ສະແກນ ລາວ\"]}', '/uploads/members/member_1767075330263_734967138.webp', '2025-12-30 13:15:14', 1, 1, 1, 1, 1, 1, 1, 1, 1, 0),
(2, 'APB', 'ທະນາຄານ ສົ່ງເສີມກະສິກຳ ຈຳກັດ (APB)', 'Agricultural Promotion Bank', '{\"primary\": \"#379685\", \"secondary\": \"#215a50\"}', 'https://www.facebook.com/APB.Bank/?locale=th_TH', 'https://www.apb.com.la', '{\"items\": [\"ກວດສອບຍອດເງິນຂ້າມທະນາຄານຜ່ານຕູ້ ATM\", \"ໂອນເງິນຂ້າມທະນາຄານຜ່ານຕູ້ ATM\", \"ຖອນເງິນສົດຂ້າມທະນາຄານຜ່ານຕູ້ ATM\"]}', '{\"items\": [\"ໂອນເງິນຂ້າມທະນາຄານເທິງມືຖືນຳໃຊ້ເລກບັນຊີ\", \"ໂອນເງິນຂ້າມທະນາຄານຜ່ານ QR CODE\", \"ຊຳລະຄ່າສິນຄ້າ ແລະ ບໍລິການ ໂດຍສະແກນ QR CODE\"]}', '{\"items\": [\"ກຳປູເຈຍ ສະແກນ ລາວ\", \"ລາວ ສະແກນ ກຳປູເຈຍ\", \"ໄທ ສະແກນ ລາວ\", \"ລາວ ສະແກນ ໄທ\", \"ຫວຽດນາມ ສະແກນ ລາວ\", \"ຈີນ ສະແກນ ລາວ\"]}', '/uploads/members/member_1767075491430_793960757.webp', '2025-12-30 13:18:11', 1, 1, 1, 1, 1, 1, 1, 1, 1, 0),
(3, 'LDB', 'ທະນາຄານ ພັດທະນາລາວ ຈຳກັດ (LDB)', 'Lao Development Bank', '{\"primary\": \"#233f73\", \"secondary\": \"#1c335f\"}', 'https://www.facebook.com/ldblao', 'https://www.ldblao.la/', '{\"items\": [\"ກວດສອບຍອດເງິນຂ້າມທະນາຄານຜ່ານຕູ້ ATM\", \"ໂອນເງິນຂ້າມທະນາຄານຜ່ານຕູ້ ATM\", \"ໂອນເງິນຂ້າມທະນາຄານຜ່ານໂທລະສັບດ້ວຍເລກໜ້າບັດ\", \"ຖອນເງິນສົດຂ້າມທະນາຄານຜ່ານຕູ້ ATM\"]}', '{\"items\": [\"ໂອນເງິນຂ້າມທະນາຄານເທິງມືຖືນຳໃຊ້ເລກບັນຊີ\", \"ໂອນເງິນຂ້າມທະນາຄານຜ່ານ QR CODE\", \"ຊຳລະຄ່າສິນຄ້າ ແລະ ບໍລິການ ໂດຍສະແກນ QR CODE\"]}', '{\"items\": [\"ກຳປູເຈຍ ສະແກນ ລາວ\", \"ໄທ ສະແກນ ລາວ\", \"ຈີນ ສະແກນ ລາວ\", \"ລາວ ສະແກນ ໄທ\", \"ຫວຽດນາມ ສະແກນ ລາວ\"]}', '/uploads/members/member_1767075676713_713419408.webp', '2025-12-30 13:21:16', 1, 1, 1, 1, 1, 1, 1, 1, 1, 0),
(4, 'LVB', 'ທະນາຄານ ຮ່ວມທຸລະກິດລາວ-ຫວຽດ (LVB)', 'Laos - Vietnam Joint Venture Bank', '{\"primary\": \"#18479e\", \"secondary\": \"#232299\"}', 'https://www.facebook.com/LaoVietBank', 'https://www.laovietbank.com.la/la/', '{\"items\": [\"ກວດສອບຍອດເງິນຂ້າມທະນາຄານຜ່ານຕູ້ ATM\", \"ໂອນເງິນຂ້າມທະນາຄານຜ່ານຕູ້ ATM\", \"ຖອນເງິນສົດຂ້າມທະນາຄານຜ່ານຕູ້ ATM\"]}', '{\"items\": [\"ໂອນເງິນຂ້າມທະນາຄານເທິງມືຖືນຳໃຊ້ເລກບັນຊີ\", \"ໂອນເງິນຂ້າມທະນາຄານຜ່ານ QR CODE\", \"ຊຳລະຄ່າສິນຄ້າ ແລະ ບໍລິການ ໂດຍສະແກນ QR CODE\"]}', '{\"items\": [\"ກຳປູເຈຍ ສະແກນ ລາວ\", \"ລາວ ສະແກນ ໄທ\", \"ຫວຽດນາມ ສະແກນ ລາວ\", \"ຈີນ ສະແກນ ລາວ\", \"ໄທ ສະແກນ ລາວ\"]}', '/uploads/members/member_1767075771350_191983855.webp', '2025-12-30 13:22:51', 1, 1, 1, 1, 1, 1, 1, 1, 1, 0),
(5, 'JDB', 'ທະນາຄານ ຮ່ວມພັດທະນາ ມະຫາຊົນ (JDB)', 'Joint Development Bank', '{\"primary\": \"#2b83df\", \"secondary\": \"#0953a0\"}', 'https://www.facebook.com/jdbbanklaos', 'https://www.jdbbank.com.la/', '{\"items\": [\"ກວດສອບຍອດເງິນຂ້າມທະນາຄານຜ່ານຕູ້ ATM\", \"ໂອນເງິນຂ້າມທະນາຄານຜ່ານຕູ້ ATM\", \"ຖອນເງິນສົດຂ້າມທະນາຄານຜ່ານຕູ້ ATM\"]}', '{\"items\": [\"ໂອນເງິນຂ້າມທະນາຄານເທິງມືຖືນຳໃຊ້ເລກບັນຊີ\", \"ໂອນເງິນຂ້າມທະນາຄານຜ່ານ QR CODE\", \"ຊຳລະຄ່າສິນຄ້າ ແລະ ບໍລິການ ໂດຍສະແກນ QR CODE\"]}', '{\"items\": [\"ກຳປູເຈຍ ສະແກນ ລາວ\", \"ລາວ ສະແກນ ໄທ\", \"ໄທ ສະແກນ ລາວ\", \"ຫວຽດນາມ ສະແກນ ລາວ\", \"ຈີນ ສະແກນ ລາວ\"]}', '/uploads/members/member_1767075853158_170396885.webp', '2025-12-30 13:24:13', 1, 1, 1, 1, 1, 1, 1, 1, 1, 0),
(6, 'STB', 'ທະນາຄານ ເອັສທີ ຈຳກັດ (STB)', 'ST Bank Limited', '{\"primary\": \"#0903ff\", \"secondary\": \"#010098\"}', 'https://www.facebook.com/STBankLaos', 'https://www.stbanklaos.la', '{\"items\": [\"ກວດສອບຍອດເງິນຂ້າມທະນາຄານຜ່ານຕູ້ ATM\", \"ໂອນເງິນຂ້າມທະນາຄານຜ່ານຕູ້ ATM\", \"ຖອນເງິນສົດຂ້າມທະນາຄານຜ່ານຕູ້ ATM\"]}', '{\"items\": [\"ໂອນເງິນຂ້າມທະນາຄານເທິງມືຖືນຳໃຊ້ເລກບັນຊີ\", \"ໂອນເງິນຂ້າມທະນາຄານຜ່ານ QR CODE\", \"ຊຳລະຄ່າສິນຄ້າ ແລະ ບໍລິການ ໂດຍສະແກນ QR CODE\"]}', '{\"items\": [\"ລາວ ສະແກນ ກຳປູເຈຍ\", \"ກຳປູເຈຍ ສະແກນ ລາວ\", \"ໄທ ສະແກນ ລາວ\", \"ລາວ ສະແກນ ໄທ\", \"ຫວຽດນາມ ສະແກນ ລາວ\", \"ຈີນ ສະແກນ ລາວ\"]}', '/uploads/members/member_1767075947515_169607663.webp', '2025-12-30 13:25:47', 1, 1, 1, 1, 1, 1, 1, 1, 1, 0),
(7, 'BIC', 'ທະນາຄານ ບີໄອຊີ ລາວ ຈຳກັດ (BIC)', 'BIC Bank Lao', '{\"primary\": \"#344872\", \"secondary\": \"#213051\"}', 'https://www.facebook.com/BICBANKLAO', 'https://www.biclaos.com', '{\"items\": [\"ກວດສອບຍອດເງິນຂ້າມທະນາຄານຜ່ານຕູ້ ATM\", \"ໂອນເງິນຂ້າມທະນາຄານຜ່ານຕູ້ ATM\", \"ຖອນເງິນສົດຂ້າມທະນາຄານຜ່ານຕູ້ ATM\"]}', '{\"items\": [\"ໂອນເງິນຂ້າມທະນາຄານເທິງມືຖືນຳໃຊ້ເລກບັນຊີ\", \"ໂອນເງິນຂ້າມທະນາຄານຜ່ານ QR CODE\", \"ຊຳລະຄ່າສິນຄ້າ ແລະ ບໍລິການ ໂດຍສະແກນ QR CODE\"]}', '{\"items\": [\"ກຳປູເຈຍ ສະແກນ ລາວ\", \"ຫວຽດນາມ ສະແກນ ລາວ\"]}', '/uploads/members/member_1767076022574_948836797.webp', '2025-12-30 13:27:02', 1, 1, 1, 1, 1, 1, 1, 1, 1, 0),
(8, 'ICBC', 'ທະນາຄານ ອຸດສາຫະກຳແລະການຄ້າຈີນ ຈຳກັດ ສາຂານະຄອນຫຼວງວຽງຈັນ (ICBC)', 'Industrial and Commercial Bank of China Limited', '{\"primary\": \"#cb0202\", \"secondary\": \"#a71f33\"}', 'https://www.facebook.com/icbcglobal/', 'https://vientiane.icbc.com.cn/en/column/1438058341816746015.html', '{\"items\": [\"ກວດສອບຍອດເງິນຂ້າມທະນາຄານຜ່ານຕູ້ ATM\", \"ໂອນເງິນຂ້າມທະນາຄານຜ່ານຕູ້ ATM\", \"ຖອນເງິນສົດຂ້າມທະນາຄານຜ່ານຕູ້ ATM\"]}', '{\"items\": [\"ໂອນເງິນຂ້າມທະນາຄານເທິງມືຖືນຳໃຊ້ເລກບັນຊີ\", \"ໂອນເງິນຂ້າມທະນາຄານຜ່ານ QR CODE\", \"ຊຳລະຄ່າສິນຄ້າ ແລະ ບໍລິການ ໂດຍສະແກນ QR CODE\"]}', '{\"items\": []}', '/uploads/members/member_1767076130669_548848311.webp', '2025-12-30 13:28:50', 1, 1, 0, 1, 1, 1, 1, 1, 0, 0),
(9, 'BOC', 'ທະນາຄານແຫ່ງ ປະເທດຈີນ (ຮົງກົງ) ສາຂານະຄອນຫຼວງວຽງຈັນ (BOC)', 'Bank of China', '{\"primary\": \"#c00b11\", \"secondary\": \"#a71f33\"}', 'https://www.facebook.com/profile.php?id=100066833677650', 'https://www.boc.cn/en/', '{\"items\": [\"ກວດສອບຍອດເງິນຂ້າມທະນາຄານຜ່ານຕູ້ ATM\", \"ຖອນເງິນສົດຂ້າມທະນາຄານຜ່ານຕູ້ ATM\"]}', '{\"items\": [\"ໂອນເງິນຂ້າມທະນາຄານເທິງມືຖືນຳໃຊ້ເລກບັນຊີ\", \"ໂອນເງິນຂ້າມທະນາຄານຜ່ານ QR CODE\", \"ຊຳລະຄ່າສິນຄ້າ ແລະ ບໍລິການ ໂດຍສະແກນ QR CODE\"]}', '{\"items\": []}', '/uploads/members/member_1767663591167_226332913.webp', '2025-12-30 13:29:41', 1, 1, 0, 1, 1, 0, 1, 1, 0, 0),
(10, 'VTB', 'ທະນາຄານ ຫວຽດຕິນ ລາວ ຈຳກັດ (VTB)', 'VietinBank', '{\"primary\": \"#0086e7\", \"secondary\": \"#0c51d1\"}', 'https://www.facebook.com/vtblao', 'https://laoefast.vietinbank.com.la', '{\"items\": [\"ກວດສອບຍອດເງິນຂ້າມທະນາຄານຜ່ານຕູ້ ATM\", \"ຖອນເງິນສົດຂ້າມທະນາຄານຜ່ານຕູ້ ATM\"]}', '{\"items\": [\"ຊຳລະຄ່າສິນຄ້າ ແລະ ບໍລິການ ໂດຍສະແກນ QR CODE\", \"ໂອນເງິນຂ້າມທະນາຄານຜ່ານ QR CODE\", \"ໂອນເງິນຂ້າມທະນາຄານເທິງມືຖືນຳໃຊ້ເລກບັນຊີ\"]}', '{\"items\": [\"ໄທ ສະແກນ ລາວ\", \"ຫວຽດນາມ ສະແກນ ລາວ\"]}', '/uploads/members/member_1767076291558_319376320.webp', '2025-12-30 13:31:31', 1, 1, 1, 1, 1, 0, 1, 1, 1, 0),
(11, 'IDB', 'ທະນາຄານ ອິນໂດຈີນ ຈຳກັດ (IB)', 'Indochina Bank', '{\"primary\": \"#8828d1\", \"secondary\": \"#430076\"}', 'https://www.facebook.com/indochina.bank.page', 'https://iblaos.com', '{\"items\": [\"ກວດສອບຍອດເງິນຂ້າມທະນາຄານຜ່ານຕູ້ ATM\", \"ໂອນເງິນຂ້າມທະນາຄານຜ່ານຕູ້ ATM\", \"ຖອນເງິນສົດຂ້າມທະນາຄານຜ່ານຕູ້ ATM\"]}', '{\"items\": [\"ໂອນເງິນຂ້າມທະນາຄານເທິງມືຖືນຳໃຊ້ເລກບັນຊີ\", \"ໂອນເງິນຂ້າມທະນາຄານຜ່ານ QR CODE\", \"ຊຳລະຄ່າສິນຄ້າ ແລະ ບໍລິການ ໂດຍສະແກນ QR CODE\"]}', '{\"items\": [\"ກຳປູເຈຍ ສະແກນ ລາວ\", \"ໄທ ສະແກນ ລາວ\", \"ຫວຽດນາມ ສະແກນ ລາວ\"]}', '/uploads/members/member_1767076463129_875463447.webp', '2025-12-30 13:34:23', 1, 1, 1, 1, 1, 1, 1, 1, 1, 0),
(12, 'ACLEDA', 'ທະນາຄານ ເອຊີລີດາ ລາວ ຈຳກັດ (ACLEDA)', 'ACLEDA BANK', '{\"primary\": \"#006DBD\", \"secondary\": \"#183A67\"}', 'https://www.facebook.com/acledabanklao', 'https://www.acledabank.com.la/la/lao/', '{\"items\": [\"ກວດສອບຍອດເງິນຂ້າມທະນາຄານຜ່ານຕູ້ ATM\", \"ໂອນເງິນຂ້າມທະນາຄານຜ່ານຕູ້ ATM\", \"ຖອນເງິນສົດຂ້າມທະນາຄານຜ່ານຕູ້ ATM\"]}', '{\"items\": [\"ໂອນເງິນຂ້າມທະນາຄານຜ່ານ QR CODE\", \"ໂອນເງິນຂ້າມທະນາຄານເທິງມືຖືນຳໃຊ້ເລກບັນຊີ\", \"ຊຳລະຄ່າສິນຄ້າ ແລະ ບໍລິການ ໂດຍສະແກນ QR CODE\"]}', '{\"items\": [\"ກຳປູເຈຍ ສະແກນ ລາວ\", \"ລາວ ສະແກນ ກຳປູເຈຍ\", \"ໄທ ສະແກນ ລາວ\", \"ລາວ ສະແກນ ໄທ\", \"ຫວຽດນາມ ສະແກນ ລາວ\", \"ຈີນ ສະແກນ ລາວ\"]}', '/uploads/members/member_1767076564371_57037919.webp', '2025-12-30 13:36:04', 1, 1, 1, 1, 1, 1, 1, 1, 1, 0),
(13, 'MJBL', 'ທະນາຄານ ມາຣູຮານ ເຈແປນ ລາວ ຈຳກັດ (MJBL)', 'MARUHAN Japan Bank Lao', '{\"primary\": \"#eb1c24\", \"secondary\": \"#6d0302\"}', 'https://www.facebook.com/MaruhanJapanBankLao/', 'https://maruhanjapanbanklao.com', '{\"items\": [\"ກວດສອບຍອດເງິນຂ້າມທະນາຄານຜ່ານຕູ້ ATM\", \"ໂອນເງິນຂ້າມທະນາຄານຜ່ານຕູ້ ATM\", \"ຖອນເງິນສົດຂ້າມທະນາຄານຜ່ານຕູ້ ATM\"]}', '{\"items\": [\"ໂອນເງິນຂ້າມທະນາຄານເທິງມືຖືນຳໃຊ້ເລກບັນຊີ\", \"ໂອນເງິນຂ້າມທະນາຄານຜ່ານ QR CODE\", \"ຊຳລະຄ່າສິນຄ້າ ແລະ ບໍລິການ ໂດຍສະແກນ QR CODE\"]}', '{\"items\": [\"ລາວ ສະແກນ ໄທ\", \"ໄທ ສະແກນ ລາວ\", \"ຫວຽດນາມ ສະແກນ ລາວ\", \"ຈີນ ສະແກນ ລາວ\"]}', '/uploads/members/member_1767076697842_593333658.webp', '2025-12-30 13:38:18', 1, 1, 1, 1, 1, 1, 1, 1, 1, 0),
(14, 'SACOM', 'ທະນາຄານ ໄຊງ່ອນເທືອງຕິ່ນ ລາວ ຈຳກັດ (SACOM)', 'Saigon Thuong Tin Commercial Joint Stock Bank', '{\"primary\": \"#18479e\", \"secondary\": \"#232299\"}', 'https://www.facebook.com/SacombankLao', 'https://www.sacombank.com.la', '{\"items\": [\"ກວດສອບຍອດເງິນຂ້າມທະນາຄານຜ່ານຕູ້ ATM\", \"ໂອນເງິນຂ້າມທະນາຄານຜ່ານຕູ້ ATM\", \"ຖອນເງິນສົດຂ້າມທະນາຄານຜ່ານຕູ້ ATM\"]}', '{\"items\": [\"ໂອນເງິນຂ້າມທະນາຄານເທິງມືຖືນຳໃຊ້ເລກບັນຊີ\", \"ໂອນເງິນຂ້າມທະນາຄານຜ່ານ QR CODE\", \"ຊຳລະຄ່າສິນຄ້າ ແລະ ບໍລິການ ໂດຍສະແກນ QR CODE\"]}', '{\"items\": [\"ກຳປູເຈຍ ສະແກນ ລາວ\", \"ລາວ ສະແກນ ກຳປູເຈຍ\", \"ຫວຽດນາມ ສະແກນ ລາວ\", \"ໄທ ສະແກນ ລາວ\", \"ລາວ ສະແກນ ໄທ\"]}', '/uploads/members/member_1767076800111_838647641.webp', '2025-12-30 13:40:00', 1, 1, 1, 1, 1, 1, 1, 1, 1, 0),
(15, 'KBANK', 'ທະນາຄານ ກະສິກອນໄທ ຈຳກັດຜູ້ດຽວ (KBANK)', 'KASIKORNBANK Public Company Limited', '{\"primary\": \"#00a850\", \"secondary\": \"#006530\"}', 'https://www.facebook.com/KBankLaos/', 'https://www.kasikornbank.com.la', '{\"items\": [\"ໂອນເງິນຂ້າມທະນາຄານຜ່ານຕູ້ ATM\", \"ກວດສອບຍອດເງິນຂ້າມທະນາຄານຜ່ານຕູ້ ATM\", \"ຖອນເງິນສົດຂ້າມທະນາຄານຜ່ານຕູ້ ATM\"]}', '{\"items\": [\"ໂອນເງິນຂ້າມທະນາຄານເທິງມືຖືນຳໃຊ້ເລກບັນຊີ\", \"ໂອນເງິນຂ້າມທະນາຄານຜ່ານ QR CODE\", \"ຊຳລະຄ່າສິນຄ້າ ແລະ ບໍລິການ ໂດຍສະແກນ QR CODE\"]}', '{\"items\": [\"ກຳປູເຈຍ ສະແກນ ລາວ\", \"ໄທ ສະແກນ ລາວ\"]}', '/uploads/members/member_1767076919670_691638820.webp', '2025-12-30 13:41:59', 1, 1, 1, 1, 1, 1, 1, 1, 1, 0),
(16, 'BFL', 'ທະນາຄານ ລາວຝຣັ່ງ ຈຳກັດ (BFL)', 'Banque Franco-Lao', '{\"primary\": \"#006dbd\", \"secondary\": \"#183a67\"}', 'https://www.facebook.com/bflbank', 'https://bfl-bred.com', '{\"items\": []}', '{\"items\": [\"ໂອນເງິນຂ້າມທະນາຄານເທິງມືຖືນຳໃຊ້ເລກບັນຊີ\", \"ໂອນເງິນຂ້າມທະນາຄານຜ່ານ QR CODE\", \"ຊຳລະຄ່າສິນຄ້າ ແລະ ບໍລິການ ໂດຍສະແກນ QR CODE\"]}', '{\"items\": []}', '/uploads/members/member_1767076991244_212563434.webp', '2025-12-30 13:43:11', 0, 1, 0, 0, 0, 0, 1, 1, 0, 0),
(17, 'PSVB', 'ທະນາຄານ ພົງສະຫວັນ ຈຳກັດ (PSVB)', 'Phongsavanh Bank', '{\"primary\": \"#12a14d\", \"secondary\": \"#0b6f3a\"}', 'https://www.facebook.com/phongsavanhbankltd', 'https://www.phongsavanhbank.com', '{\"items\": [\"ກວດສອບຍອດເງິນຂ້າມທະນາຄານຜ່ານຕູ້ ATM\", \"ຖອນເງິນສົດຂ້າມທະນາຄານຜ່ານຕູ້ ATM\"]}', '{\"items\": [\"ໂອນເງິນຂ້າມທະນາຄານເທິງມືຖືນຳໃຊ້ເລກບັນຊີ\", \"ໂອນເງິນຂ້າມທະນາຄານຜ່ານ QR CODE\", \"ຊຳລະຄ່າສິນຄ້າ ແລະ ບໍລິການ ໂດຍສະແກນ QR CODE\"]}', '{\"items\": [\"ໄທ ສະແກນ ລາວ\", \"ລາວ ສະແກນ ໄທ\", \"ຫວຽດນາມ ສະແກນ ລາວ\", \"ຈີນ ສະແກນ ລາວ\"]}', '/uploads/members/member_1767077092208_8120837.webp', '2025-12-30 13:44:52', 1, 1, 1, 1, 1, 0, 1, 1, 1, 0),
(18, 'MB', 'ທະນາຄານ ຫຸ້ນສ່ວນການຄ້າທະຫານ ສາຂາລາວ (MB)', 'Military Commercial Joint Stock Bank', '{\"primary\": \"#3b46fb\", \"secondary\": \"#141fd3\"}', 'https://www.facebook.com/MBBANKLAOS', 'https://mbbank.com.la', '{\"items\": []}', '{\"items\": [\"ໂອນເງິນຂ້າມທະນາຄານເທິງມືຖືນຳໃຊ້ເລກບັນຊີ\", \"ໂອນເງິນຂ້າມທະນາຄານຜ່ານ QR CODE\", \"ຊຳລະຄ່າສິນຄ້າ ແລະ ບໍລິການ ໂດຍສະແກນ QR CODE\"]}', '{\"items\": [\"ລາວ ສະແກນ ກຳປູເຈຍ\", \"ຫວຽດນາມ ສະແກນ ລາວ\", \"ຈີນ ສະແກນ ລາວ\"]}', '/uploads/members/member_1767077173547_565850931.webp', '2025-12-30 13:46:13', 0, 1, 1, 0, 0, 0, 1, 1, 1, 0),
(21, 'PB', 'ທະນາຄານ ພາບລິກ ລາວ ຈຳກັດ (PBB)', 'PUBLIC Bank', '{\"primary\": \"#f32b24\", \"secondary\": \"#c32c2c\"}', 'https://www.facebook.com/p/Public-Bank-Lao-61566020099587/', 'https://www.publicbank.com.la', '{\"items\": [\"ກວດສອບຍອດເງິນຂ້າມທະນາຄານຜ່ານຕູ້ ATM\", \"ໂອນເງິນຂ້າມທະນາຄານຜ່ານຕູ້ ATM\", \"ຖອນເງິນສົດຂ້າມທະນາຄານຜ່ານຕູ້ ATM\"]}', '{\"items\": []}', '{\"items\": []}', '/uploads/members/member_1767077494618_919278831.webp', '2025-12-30 13:51:34', 1, 0, 0, 1, 1, 1, 0, 0, 0, 0),
(22, 'LCNB', 'ທະນາຄານ ລາວຈີນ ຈຳກັດ (LCNB)', 'Lao China Bank', '{\"primary\": \"#38bdf8\", \"secondary\": \"#0074ad\"}', 'https://web.facebook.com/laochinabank', 'https://lcnb.la/lcnbhome-la.php', '{\"items\": [\"ກວດສອບຍອດເງິນຂ້າມທະນາຄານຜ່ານຕູ້ ATM\", \"ໂອນເງິນຂ້າມທະນາຄານຜ່ານຕູ້ ATM\", \"ຖອນເງິນສົດຂ້າມທະນາຄານຜ່ານຕູ້ ATM\"]}', '{\"items\": []}', '{\"items\": []}', '/uploads/members/member_1767077564473_576732568.webp', '2025-12-30 13:52:44', 1, 0, 0, 1, 1, 1, 0, 0, 0, 0),
(23, 'LMM', 'ບໍລິສັດ ລາວ ໂມບາຍມັນນີ ຈໍາກັດຜູ້ດຽວ (LMM)', 'MmoneyX', '{\"primary\": \"#ef3327\", \"secondary\": \"#a20000\"}', 'https://www.facebook.com/laomobilemoney', 'https://www.mmoney.la', '{\"items\": []}', '{\"items\": [\"ໂອນເງິນຂ້າມທະນາຄານຜ່ານ QR CODE\", \"ຊຳລະຄ່າສິນຄ້າ ແລະ ບໍລິການ ໂດຍສະແກນ QR CODE\", \"ໂອນເງິນຂ້າມທະນາຄານເທິງມືຖືນຳໃຊ້ເລກບັນຊີ\"]}', '{\"items\": []}', '/uploads/members/member_1767577553588_196254452.webp', '2026-01-05 08:45:53', 0, 1, 0, 0, 0, 0, 1, 1, 0, 1),
(40, 'SFT', 'ບໍລິສັດ ສະຕາ ຟິນເທັກ ຈຳກັດຜູ້ດຽວ (SFT)', 'Umoney', '{\"primary\": \"#f7ad29\", \"secondary\": \"#e93e38\"}', 'https://www.facebook.com/umoney.unitel.la', 'https://u-money.com.la', '{\"items\": []}', '{\"items\": [\"ໂອນເງິນຂ້າມທະນາຄານເທິງມືຖືນຳໃຊ້ເລກບັນຊີ\", \"ໂອນເງິນຂ້າມທະນາຄານຜ່ານ QR CODE\", \"ຊຳລະຄ່າສິນຄ້າ ແລະ ບໍລິການ ໂດຍສະແກນ QR CODE\"]}', '{\"items\": []}', '/uploads/members/member_1768985933094_119278753.webp', '2026-01-21 15:58:53', 0, 1, 0, 0, 0, 0, 1, 1, 0, 1);

--
-- Triggers `members`
--
DELIMITER $$
CREATE TRIGGER `trg_members_ai` AFTER INSERT ON `members` FOR EACH ROW BEGIN
  INSERT INTO `notifications` (`entity`,`action`,`ref_id`,`title`,`message`,`payload`,`linkpath`)
  VALUES (
    'member','insert',NEW.idmember,
    'Member created',
    LEFT(CONCAT('Created member bank: ', NEW.Bankcode, ' - ', NEW.BanknameLA), 255),
    JSON_OBJECT('idmember',NEW.idmember,'Bankcode',NEW.Bankcode,'BanknameLA',NEW.BanknameLA,'BanknameEN',NEW.BanknameEN),
    '/members'
  );
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `news`
--

CREATE TABLE `news` (
  `idnews` int NOT NULL,
  `header_news` varchar(255) NOT NULL,
  `category` varchar(45) NOT NULL,
  `date_time` datetime NOT NULL,
  `sub_header` varchar(255) DEFAULT NULL,
  `tags` json DEFAULT NULL,
  `description_news` longtext NOT NULL,
  `hero_img` varchar(255) NOT NULL,
  `gallery` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `news`
--

INSERT INTO `news` (`idnews`, `header_news`, `category`, `date_time`, `sub_header`, `tags`, `description_news`, `hero_img`, `gallery`, `created_at`, `updated_at`) VALUES
(1, 'ບໍລິສັດ ລາວເນເຊີນນໍ ເພເມັ້ນ ເນັດເວີກ ຈຳກັດ (LAPNet) ເຂົ້າຮ່ວມງານສຳມະນາ ວ່າດ້ວຍການຊຳລະດ້ວຍລະບົບ QR Code ທີ່ ສສ. ຫວຽດນາມ', 'Meeting', '2025-12-04 00:00:00', NULL, '[\"Meeting\", \"LAPNet\"]', 'ໃນລະຫວ່າງວັນທີ 18 ຫາ 22 ພະຈິກ 2025, ທ່ານຜູ້ອຳນວຍການ ຂອງບໍລິສັດ ລາວເນເຊີນນໍ ເພເມັ້ນ ເນັດເວີກ ຈຳກັດ (LAPNet), ພ້ອມດ້ວຍຄະນະ, ໄດ້ເດີນທາງໄປເຂົ້າຮ່ວມງານສຳມະນາ ທີ່ ສສ. ຫວຽດນາມ, ພາຍໃຕ້ຫົວຂໍ້: \'QR Code Payments Transparency and Unlimited Experiences\' (ຄວາມໂປ່ງໃສ ແລະ ປະສົບການທີ່ບໍ່ມີຂີດຈໍາກັດຂອງການຊໍາລະດ້ວຍລະບົບ QR Code).\r\n\r\nການເຂົ້າຮ່ວມງານສຳມະນາໃນຄັ້ງນີ້, ຖືເປັນບາດກ້າວອັນສຳຄັນຂອງ LAPNet ໃນການສືບຕໍ່ ຍົກສູງບົດບາດ ແລະ ພັດທະນາລະບົບການຊຳລະເງິນ ຢູ່ ສປປ ລາວ ໃຫ້ມີຄວາມທັນສະໄໝ ແລະ ສອດຄ່ອງກັບມາດຕະຖານສາກົນ. ງານສຳມະນາຄັ້ງນີ້ ກໍ່ມີເປົ້າໝາຍເພື່ອ ແລກປ່ຽນບົດຮຽນ ແລະ ສົ່ງເສີມການຫັນເປັນມາດຕະຖານ ຂອງການຊຳລະເງິນຜ່ານລະບົບ QR Code ໃນພາກພື້ນ ແລະ ສາກົນ, ເຊິ່ງເປັນຫົວຂໍ້ທີ່ມີຄວາມກ່ຽວຂ້ອງໂດຍກົງກັບພາລະບົດບາດຂອງ LAPNet.', '/uploads/news/news_hero_1767147517430_265472864.webp', '[\"/uploads/news/gallery/news_gallery_1767320636207_560435757.webp\", \"/uploads/news/gallery/news_gallery_1767320661578_339858485.webp\", \"/uploads/news/gallery/news_gallery_1767320661582_811807763.webp\"]', '2025-12-31 02:18:37', '2026-01-06 07:03:44'),
(2, 'ເຖິງທະນາຄານຈະປິດ ກໍ່ໂອນເງິນຂ້າມທະນາຄານໄດ້ ພຽງແຕ່ມີ Application ຂອງທະນາຄານທີ່ເຂົ້າຮ່ວມເປັນສະມາຊິກ', 'Announcement', '2025-11-10 09:20:04', NULL, '[\"Announcement\", \"LAPNet\", \"ທຸກທີ່ທຸກເວລາທຸກຊ່ອງທາງການຊຳລະ\"]', 'ພຽງແຕ່ທ່ານມີ Application ຂອງທະນາຄານໃດກໍ່ໄດ້ ທີ່ເປັນສະມາຊິກ ຂອງ LAPNet\r\nກໍໂອນໄດ້ທັນທີ ຕະຫຼອດ 24 ຊົ່ວໂມງ.', '/uploads/news/news_hero_1767147605180_776259149.webp', '[]', '2025-12-31 02:20:05', '2025-12-31 02:20:05'),
(3, 'ຄະນະສະພາບໍລິຫານຂອງ ບໍລິສັດ ຢູນຽນເພ ສປ.ຈີນ (UPI) ເຂົ້າພົບປະຢ້ຽມຢາມ ຄະນະບໍລິຫານຂອງບໍລິສັດ ລາວເນເຊີນນໍ ເພເມັ້ນ ເນັດເວີກ ຈຳກັດ (LAPNet)', 'Meeting', '2025-11-06 09:23:25', NULL, '[\"Meeting\", \"CrossBorderQRPayment\", \"LaoChinaCooperation\"]', 'ຄະນະສະພາບໍລິຫານຂອງ ບໍລິສັດ ຢູນຽນເພ ສປ.ຈີນ (UPI) ເຂົ້າພົບປະຢ້ຽມຢາມ ຄະນະບໍລິຫານຂອງບໍລິສັດ ລາວເນເຊີນນໍ ເພເມັ້ນ ເນັດເວີກ ຈຳກັດ (LAPNet)\r\n\r\nໃນຕອນບ່າຍຂອງວັນທີ 03 ພະຈິກ 2025, ທີ່ ບໍລິສັດ ລາວເນເຊີນນໍ ເພເມັ້ນ ເນັດເວີກ ຈຳກັດ (LAPNet), ໄດ້ມີການຈັດກອງປະຊຸມປຶກສາຫາລືຮອບດ້ານຕໍ່ກັບ ຄວາມຄືບໜ້າຂອງໂຄງການເຊື່ອມໂຍງລະບົບຊຳລະຂ້າມແດນ ລາວ-ຈີນ ແລະ ການຮ່ວມມືດ້ານຍຸດທະສາດການຊຳລະ ລະຫວ່າງ ບໍລິສັດ ລາວເນເຊີນນໍ ເພເມັ້ນ ເນັດເວີກ ຈຳກັດ ແລະ ບໍລິສັດ ຢູນຽນເພ ສປ.ຈີນ.\r\nກອງປະຊຸມຄັ້ງນີ້ ໄດ້ລົງເລິກດ້ານການຮ່ວມມືທັງສອງຝ່າຍໃນການຈັດຕັ້ງປະຕິບັດການເປີດໂຕໃນໄລຍະທີ 02 ລາວ ສະແກນ ຈີນ ແລະ ຊຸກຍູ້ສົ່ງເສີມການເຊື່ອມຕໍ່ຜະລິດຕະພັນຊຳລະອື່ນໆ ລະຫວ່າງ ສປປ ລາວ ແລະ ສປ ຈີນ ເພື່ອອຳນວຍຄວາມສະດວກດ້ານການຊຳລະລະຫວ່າງ 02 ປະເທດ ລາວ-ຈີນ.\r\n\r\nການຢ້ຽມຢາມໃນຄັ້ງນີ້ໄດ້ສະແດງໃຫ້ເຫັນເຖິງການຮ່ວມມືໃນການຍົກລະດັບພື້ນຖານໂຄງລ່າງການຊຳລະແຫ່ງຊາດ ຂອງ ສປປ ລາວ ໃຫ້ເຊື່ອມໂຍງກັບພາກພື້ນ ແລະ ສາກົນ ໃຫ້ຮັບປະກັນການຊຳລະສະສາງລະຫວ່າງສອງປະເທດໃຫ້ມີຄວາມສະດວກ, ວ່ອງໄວ ແລະ ປອດໄພຍິ່ງຂຶ້ນ, ໂດຍສະເພາະການຮອງຮັບການໃຊ້ຈ່າຍຂອງນັກທ່ອງທ່ຽວ ທັງ ສປປ ລາວ ແລະ ສປ ຈີນ  ຝ່າຍ UPI ໃຫ້ກຽດ ເຂົ້າຢ້າມຢາມໂດຍ Mr. Guo Dayong, President of China UnionPay, Mr. Xie Qunsong, Vice Chairman of UnionPay International ພ້ອມດ້ວຍຄະນະ;ຝ່າຍ LAPNet: ໃຫ້ກຽດຕ້ອນຮັບໂດຍທ່ານ: Mr.Sisamone SRITHIRATH  ຜູ້ອຳນວຍການ ແລະ Ms.Nivasone MALATHIP ຮອງອຳນວຍການ ພ້ອມດ້ວຍຄະນະບໍລິຫານຂອງ ບໍລິສັດ LAPNet;\r\n(English text below)\r\n\r\nDelegation from China UnionPay (UPI) Board of Directors Meets with Executive Management of Lao National Payment Network Sole Co., Ltd. (LAPNet)\r\nIn the afternoon of November 3, 2025, a meeting was held at the Lao National Payment Network Sole Co., Ltd. (LAPNet) to comprehensively discuss the progress of the Lao-China Cross-Border Payment System Integration Project and strategic payment cooperation between Lao National Payment Network Sole Co., Ltd. and China UnionPay.\r\nThe meeting focused on in-depth bilateral cooperation regarding the implementation of the Phase 2 launch of Lao Scan-China, and to promote the connection of other payment products between the Lao PDR and the People\'s Republic of China, with the aim of facilitating payments between the two countries.\r\n\r\nThis visit demonstrates the commitment to cooperation in elevating the national payment infrastructure of the Lao PDR to connect with regional and international systems, ensuring that payment settlements between the two countries are more convenient, faster, and more secure, particularly in supporting the spending of tourists from both the Lao PDR and the P.R. China.\r\nAttendees:\r\n\r\nUPI Delegation: The UPI delegation was honored by the visit of:\r\n• Mr. Guo Dayong, President of China UnionPay.\r\n• Mr. Xie Qunsong, Vice Chairman of UnionPay International\r\n• and accompanying delegation.\r\nLAPNet Delegation: The LAPNet team was honored to welcome the delegation, led by:\r\n• Mr. Sisamone SRITHIRATH, Chief Executive Officer.\r\n• Ms. Nivasone MALATHIP, Chief Operating Officer.\r\n• and the LAPNet Executive Management Team.', '/uploads/news/news_hero_1767147807694_272487098.webp', '[\"/uploads/news/gallery/news_gallery_1767147807697_577384957.webp\", \"/uploads/news/gallery/news_gallery_1767147807698_93084068.webp\", \"/uploads/news/gallery/news_gallery_1767147807698_523454786.webp\", \"/uploads/news/gallery/news_gallery_1767147807698_377963774.webp\", \"/uploads/news/gallery/news_gallery_1767147807698_393733681.webp\", \"/uploads/news/gallery/news_gallery_1767147807699_166844390.webp\", \"/uploads/news/gallery/news_gallery_1767147807699_277620201.webp\", \"/uploads/news/gallery/news_gallery_1767147807700_176164180.webp\"]', '2025-12-31 02:23:27', '2025-12-31 02:23:27'),
(4, 'ບໍລິສັດ ລາວເນເຊີນນໍ ເພເມັ້ນ ເນັດເວີກ ຈຳກັດ (LAPNet) ໄດ້ຈັດກອງປະຊຸມສະພາບໍລິຫານ ສະໄໝສາມັນ ປະຈຳໄຕມາດ III ຂອງປີ 2025', 'Meeting', '2025-11-03 09:28:13', NULL, '[\"Meeting\", \"LaoNationalPaymentNetwork\", \"quarterlymeeting\", \"Boardmeeting\"]', 'ບໍລິສັດ ລາວເນເຊີນນໍ ເພເມັ້ນ ເນັດເວີກ ຈຳກັດ (LAPNet) ໄດ້ຈັດກອງປະຊຸມສະພາບໍລິຫານ ສະໄໝສາມັນ ປະຈຳໄຕມາດ III ຂອງປີ 2025 ຂຶ້ນຢ່າງເປັນທາງການ ໃນຕອນບ່າຍຂອງວັນສຸກ  ວັນທີ 31 ຕຸລາ ປີ 2025 ຜ່ານມາ ທີ່ຫ້ອງປະຊຸມ ຊັ້ນ 5 ຕຶກອາຄານ ສຳນັກງານ ຄະນະກຳມະການຄຸ້ມຄອງຫຼັກຊັບ,\r\nກອງປະຊຸມໄດ້ຮັບກຽດ ການເປັນປະທານ ໂດຍ ທ່ານ ມະໂນລິດ ຊຸມພົນພັກດີ ປະທານສະພາບໍລິຫານ ແລະ ເຂົ້າຮ່ວມໂດຍ ບັນດາສະມາຊິກສະພາບໍລິຫານ ພ້ອມດ້ວຍ ຄະນະອຳນວຍການ ບໍລິສັດ LAPNet.\r\nເພື່ອທົບທວນຄືນ ແລະ ຮັບຮອງເອົາຜົນການຈັດຕັ້ງປະຕິບັດວຽກງານ ປະຈຳໄຕມາດ III ຂອງປີ 2025. ພ້ອມທັງພິຈາລະນາ ແລະ ຕົກລົງໃນການກຳນົດຍຸດທະສາດ ແລະ ແຜນການດຳເນີນງານທີ່ສຳຄັນ ສຳລັບໄຕມາດ IV ຂອງປີ 2025 ແລະ ແຜນງານຂອງປີ 2026, ເພື່ອສືບຕໍ່ພັດທະນາລະບົບການຊຳລະຂ້າມທະນາຄານ ໃຫ້ມີຄວາມກ້າວໜ້າ, ທັນສະໄໝ ແລະ ປອດໄພຍິ່ງຂຶ້ນ.', '/uploads/news/news_hero_1767148094867_728763916.webp', '[\"/uploads/news/gallery/news_gallery_1767148094870_986205747.webp\", \"/uploads/news/gallery/news_gallery_1767148094870_646113859.webp\", \"/uploads/news/gallery/news_gallery_1767148094871_248023796.webp\", \"/uploads/news/gallery/news_gallery_1767148094871_41061230.webp\", \"/uploads/news/gallery/news_gallery_1767148094871_397646345.webp\", \"/uploads/news/gallery/news_gallery_1767148094871_738199333.webp\", \"/uploads/news/gallery/news_gallery_1767148094871_398885935.webp\"]', '2025-12-31 02:28:14', '2025-12-31 02:28:14'),
(5, 'ໃນຕອນເຊົ້າວັນທີ 16 ຕຸລາ 2025 ບໍລິສັດ ລາວເນເຊິນນໍ ເພເມັ້ນ ເນັດເວີກ ຈຳກັດ (LAPNet) ໄດ້ຈັດກອງປະຊຸມກະກຽມການເຊື່ອມຕໍ່ລະບົບການຊຳລະຍ່ອຍຂ້າມແດນ ລາວ-ຈີນ ດ້ວຍສະກຸນເງິນດິຈິຕອນຢວນ (e-CNY)', 'Meeting', '2025-10-16 09:29:55', NULL, '[\"Meeting\", \"LAPNet\", \"eCNY\"]', 'ໃນຕອນເຊົ້າວັນທີ 16 ຕຸລາ 2025 ບໍລິສັດ ລາວເນເຊິນນໍ ເພເມັ້ນ ເນັດເວີກ ຈຳກັດ (LAPNet) ໄດ້ຈັດກອງປະຊຸມກະກຽມການເຊື່ອມຕໍ່ລະບົບການຊຳລະຍ່ອຍຂ້າມແດນ ລາວ-ຈີນ ດ້ວຍສະກຸນເງິນດິຈິຕອນຢວນ (e-CNY) ພາຍໃຕ້ການການປະທານຂອງ ທ່ານ ສີສະໝອນ ສຣິດທິຣາດ ຜູ້ອຳນວຍການບໍລິສັດ (LAPNet) ເຊິ່ງມີຕາງໜ້າຈາກກົມກ່ຽວຂ້ອງ ຂອງ ທຫລ, ທະນາຄານທຸລະກິດ ແລະ ບໍລິສັດ Fintech ທີ່ເປັນສະມາຊິກລະບົບ LMPS ເຂົົ້າຮ່ວມຫຼາຍກວ່າ 60 ທ່ານ.\r\nຈຸດປະສົງຕົ້ນຕໍຂອງກອງປະຊຸມ ແມ່ນເພື່ອເປັນການກະກຽມຄວາມພ້ອມເບື້ອງ ສປປ ລາວ ໃນການເຊື່ອມຕໍ່ລະບົບການຊຳລະຍ່ອຍຂ້າມແດນ ລາວ-ຈີນ ດ້ວຍສະກຸນເງິນດິຈິຕອນຢວນ (e-CNY) ແລະ ຊຸກຍູ້ໃຫ້ໂຄງການສາມາດເປີດໂຕໄລຍະທີ 1 ຈີນສະແກນລາວ ໄດ້ ເພື່ອເປັນການຂໍ່ານັບຮັບຕ້ອນວັນຊາດ ຄົບຮອບ 50 ປີ ໃນວັນທີ 02 ທັນວາ 2025 ທີ່ຈະມາເຖິງນີ້. ທີ່ປະຊຸມໄດ້ຮັບຟັງການນຳສະເໜີຄວາມເປັນມາຂອງໂຄງການ, ເຕັກນິກການເຊື່ອມຕໍ່ໃນສ່ວນທີ່ຕິດພັນກັບທະນາຄານສະມາຊິກ ແລະ ທະນາຄານຫັກບັນຊີ (Settlement bank), ຮັບຟັງການນຳສະເໜີກົນໄກ ແລະ ຄວາມພ້ອມໃນການເປັນທະນາຄານຫັກບັນຊີ (Settlement bank) ສະກຸນເງິນດິ e-CNY ຢູ່  ສປປ ລາວ ຂອງທະນາຄານແຫ່ງປະເທດຈີນ (ຮົງກົງ) ສາຂານະຄອນຫຼວງວຽງຈັນ (BOC), ຫຼັງຈາກນັ້ນບັນດາຜູ້ເຂົ້າຮ່ວມປະຊຸມກໍໄດ້ມີການແລກປ່ຽນຄຳຄິດເຫັນທີ່ຕິດພັນໃນດ້ານເຕັກນິກການເຊື່ອມຕໍ່ເພື່ອເປັນການກະກຽມພ້ອມໃຫ້ໂຄງການສາມາດສຳເລັດຕາມຄາດໝາຍທີ່ວາງໄວ້.', '/uploads/news/news_hero_1767148196964_952208181.webp', '[\"/uploads/news/gallery/news_gallery_1767148196967_660031109.webp\", \"/uploads/news/gallery/news_gallery_1767148196967_401010423.webp\", \"/uploads/news/gallery/news_gallery_1767148196967_415343361.webp\", \"/uploads/news/gallery/news_gallery_1767148196967_985486262.webp\", \"/uploads/news/gallery/news_gallery_1767148196968_484183065.webp\", \"/uploads/news/gallery/news_gallery_1767148196969_541516310.webp\", \"/uploads/news/gallery/news_gallery_1767148196969_818773404.webp\"]', '2025-12-31 02:29:56', '2025-12-31 02:29:56'),
(6, '“ສະແກນຄິວອາດຽວ ຈ່າຍໄດ້ທຸກທະນາຄານ ດ້ວຍ LAO QR”', 'Announcement', '2025-09-08 09:32:29', NULL, '[\"Announcement\", \"LAPNet\", \"LAOQR\", \"ສະແກນຄິວອາງ່າຍ\"]', 'ບໍ່ຈໍາເປັນຕ້ອງມີບັນຊີຢູ່ທະນາຄານດຽວກັບຮ້ານຄ້າອີກຕໍ່ໄປ 🙌\r\nເມື່ອເຫັນປ້າຍ LAO QR ຢູ່ຮ້ານຄ້າໃດ\r\nລູກຄ້າຂອງທະນາຄານສະມາຊິກ LAPNet\r\nສາມາດ ສະແກນຈ່າຍໄດ້ທັນທີ – ຂ້າມທະນາຄານໄດ້ເລີຍ 📱✨\r\n👉 ງ່າຍ – ປອດໄພ – ສະດວກສະບາຍ\r\nພາຍໃນມາດຕະຖານ QR ດຽວກັນ ທົ່ວປະເທດ', '/uploads/news/news_hero_1767148351272_717743745.webp', '[]', '2025-12-31 02:32:31', '2025-12-31 02:32:31'),
(7, '📣📣ແລກປ່ຽນເງິນຕາຕ່າງປະເທດ ແບບປອດໄພ ✅ ເລືອກໃຊ້ Function LFX ຕະຫຼາດແລກປ່ຽນເງິນຕາຕ່າງປະເທດ ໃນ ແອັບທະນາຄານຂອງທ່ານ', 'Announcement', '2025-09-03 09:34:01', NULL, '[\"Announcement\", \"LAPNet\", \"ທຸກທີ່ທຸກເວລາທຸກຊ່ອງທາງການຊຳລະ\"]', '✅ປອດໄພກວ່າ\r\n✅ອັດຕາແລກປ່ຽນດີ\r\n 👉ທະນາຄານທີ່ລູກຄ້າສາມາດແລກປ່ຽນເງິນຕາຕ່າງປະເທດດ້ວຍຕົນເອງ\r\n#BCEL #LDB #APB #JDB #LVB #STB #BIC #BFL #INDOCHINA #PSV', '/uploads/news/news_hero_1767148442910_528122411.webp', '[]', '2025-12-31 02:34:02', '2025-12-31 02:34:02'),
(8, 'ກອງປະຊຸມສະພາບໍລິຫານ ປະຈຳໄຕມາດ 2 ປີ 2025', 'Meeting', '2025-08-29 09:37:57', NULL, '[\"Meeting\", \"LAPNet\", \"ທຸກທີ່ທຸກເວລາທຸກຊ່ອງທາງການຊຳລະ\"]', 'ກອງປະຊຸມສະພາບໍລິຫານ ປະຈຳໄຕມາດ 2 ປີ 2025\r\nໃນວັນທີ 18 ສິງຫາ 2025 ທີ່ຜ່ານມາ, ບໍລິສັດ LAPNet ໄດ້ຈັດກອງປະຊຸມສະພາບໍລິຫານ ສະໄໝສາມັນ ປະຈຳໄຕມາດ II ປີ 2025 ເພື່ອສະຫຼຸບຜົນການດຳເນີນທຸລະກິດ ແລະ ກຳນົດທິດທາງແຜນໃນໄຕມາດຕໍ່ໄປ;\r\nໂດຍການເປັນປະທານ ກອງປະຊຸມ ຂອງທ່ານ ມະໂນລິດ ຊຸມພົນພັກດີ ປະທານສະພາບໍລິຫານ ພ້ອມດ້ວຍຄະນະກຳມະການ, ສະມາຊິກສະພາບໍລິຫານ ແລະ ຄະນະອຳນວຍການຂອງບໍລິສັດ LAPNet.', '/uploads/news/news_hero_1767148678690_350252439.webp', '[\"/uploads/news/gallery/news_gallery_1767148678693_26519280.webp\", \"/uploads/news/gallery/news_gallery_1767148678693_631619501.webp\", \"/uploads/news/gallery/news_gallery_1767148678696_985197026.webp\", \"/uploads/news/gallery/news_gallery_1767148678696_138202249.webp\", \"/uploads/news/gallery/news_gallery_1767148678697_524119061.webp\", \"/uploads/news/gallery/news_gallery_1767148678697_949510376.webp\"]', '2025-12-31 02:37:58', '2025-12-31 02:37:58'),
(11, '🌍✈️ ນັກທ່ອງທ່ຽວ ມາເຖິງລາວ ຊຳລະງ່າຍສະບາຍ ດ້ວຍແອັບທະນາຄານ!✨🌍', 'Announcement', '2025-08-26 09:56:51', NULL, '[\"Announcement\", \"LAPNet\", \"ທຸກທີ່ທຸກເວລາທຸກຊ່ອງທາງການຊຳລະ\", \"ຊຳລະໄດ້ທຸກທີ່ໃນລາວ\", \"ທ່ອງທ່ຽວລາວ\", \"ຊຳລະງ່າຍໆ\", \"ສະດວກສະບາຍ\", \"ທ່ອງທ່ຽວດິຈິຕອນ\", \"LAO\"]', '👉ນັກທ່ອງທ່ຽວຕ່າງປະເທດສາມາດຊຳລະຄ່າສິນຄ້າ ແລະ ບໍລິການຢູ່ຮ້ານຄ້າໃນລາວໄດ້ຢ່າງວ່ອງໄວ ພຽງແຕ່ນຳໃຊ້ແອັບທະນາຄານຈາກປະເທດຂອງຕົນ  ສະແກນທີ່ຮ້ານຄ້າໃນລາວ ທີ່ມິສັນຍາລັກ #Weaccept ໄດ້ທັນທີ.!!\r\n✅ ຊຳລະໄດ້ທັນທີ – ບໍ່ຕ້ອງແລກເປັນສະກຸນເງິນກີບ ຮ້ານຄ້າກໍ່ຮັບຍອດເປັນເງິນກີບໄດ້\r\n✅ ຮອງຮັບຫຼາຍແອັບ – ຈາກຫຼາຍປະເທດໃນພາກພື້ນ\r\n✅ ປອດໄພ – ລະບົບຊຳລະມາດຕະຖານສາກົນ\r\n✅ ສະດວກສະບາຍ – ພຽງສະແກນຄິວອາໂຄດຮ້ານຄ້າ\r\n🔔QR ຂອງທະນາຄານທີ່ຮອງຮັບການສະແກນຈາກຕ່າງປະເທດ:\r\n✅ປະເທດໄທ 🇹🇭\r\nທະນາຄານເບື້ອງໄທ: Krungsri, Krungthai, BBL, Kbank ທະນາຄານເບື້ອງລາວ: BCEL, LDB, APB, JDB, LVB, BIC, STB, IB, ACLEDA, Kbank, Sacombank, PSVB ແລະ MJBL.\r\n✅ປະເທດຫວຽດນາມ 🇻🇳\r\nທະນາຄານເບື້ອງຫວຽດນາມ: VietinBank, Sacombank, BIDV, TP Bank, MB, SHB, Nam Á, Bàn Việtທະນາຄານເບື້ອງລາວ:  BCEL, LDB, APB, JDB, LVB, BIC, STB, ACLEDA, IB, PSV, Sacombank, MJBL, MB, Kbank ແລະ VTB\r\n✅ປະເທດ ກຳປູເຈຍ 🇰🇭\r\nທະນາຄານເບື້ອງກຳປູເຈຍ: 59 ທະນາຄານທີ່ນຳໃຊ້ Bakong mobile banking Application ແລະ Acleda mobile banking application.  ທະນາຄານເບື້ອງລາວ: 11 ສະມາຊິກ ຄື: BCEL, LDB, APB, JDB, LVB, IB, ACLEDA, MB, Sacombank, STB ແລະ Kbank\r\n✅ປະເທດຈີນ 🇨🇳\r\nທະນາຄານເບື້ອງຈີນ: UnionPay (BOC, ICBC, ABC, CCB, Ping An Bank, ແລະ ອື່ນໆ) HanaPay, KB Pay, NaverPay, Woori Card, Shinhan Card ASEAN: DBS PayLah! (Singapore), Boost (Malaysia), GoPayz (Indonesia), ແລະ ອື່ນໆທະນາຄານເບື້ອງລາວ:​ 9 ສະມາຊິກຄື: BCEL, LDB, APB, JDB, LVB, STB, MJBL, ACLEDA ແລະ PSV\r\n👉ຂໍ້ມູນເພິ່ມຕື່ມ: https://www.lapnet.com.la/product/lapnet-crossborder-qrpay', '/uploads/news/news_hero_1767581811870_328814110.webp', '[]', '2026-01-05 02:56:51', '2026-01-05 02:56:51'),
(12, 'ສະຖິຕິທຸລະກຳ ແລະ ມູນຄ່າການຮັບຊຳລະຈາກຕ່າງປະເທດ ຜ່ານລະບົບຂອງ LAPNet (6 ເດືອນຕົ້ນປີ 2025)', 'Announcement', '2025-08-19 10:02:09', NULL, '[\"Announcement\", \"LAPNet\", \"ທຸກທີ່ທຸກເວລາທຸກຊ່ອງທາງການຊຳລະ\"]', 'ສະຖິຕິທຸລະກຳ ແລະ ມູນຄ່າການຮັບຊຳລະຈາກຕ່າງປະເທດ ຜ່ານລະບົບຂອງ LAPNet (6 ເດືອນຕົ້ນປີ 2025)\r\nໃນ 6 ເດືອນຕົ້ນປີ 2025 ຜ່ານມາ, QR Code ຮ້ານຄ້າຂອງບັນດາທະນາຄານທີ່ໄດ້ເຂົ້າຮ່ວມໂຄງການເປີດຮັບຊຳລະຂ້າມແດນ ກັບ 4 ປະເທດເຊັ່ນ: ໄທ ຈີນ ຫວຽດນາມ ແລະ ກຳປູເຈຍ.\r\n✅ ດ້ານຈຳນວນທຸລະກຳ: ປະເທດໄທ ມີຈຳນວນທຸລະກຳສູງສຸດ ກວມເອົາ 55%, ປະເທດ ຈີນ 36%, ປະເທດຫວຽດນາມ 5% ແລະ ປະເທດ ກຳປູເຈຍ 4%.\r\n✅ ດ້ານມູນຄ່າການຊຳລະ (ສະກຸນເງິນກີບ): ປະເທດຈີນມີຈຳນວນມູນຄ່າການຊຳລະສູງກວ່າປະເທດອື່ນໆ', '/uploads/news/news_hero_1767582130533_627180484.webp', '[]', '2026-01-05 03:02:10', '2026-01-05 03:02:10'),
(13, '👉ໂອນເງິນລະຫວ່າງທະນາຄານ ໄດ້ທັນທີຕະຫຼອດ 24/7', 'Announcement', '2025-08-18 10:03:57', NULL, '[\"Announcement\", \"LAPNet\", \"AnywhereAnytimeAnypaymentchannel\"]', '👉#ໂອນເງິນລະຫວ່າງທະນາຄານ ໄດ້ທັນທີຕະຫຼອດ 24/7\r\n✅ໂອນດ້ວຍ QR code ຂອງທະນາຄານໃດກໍ່ໄດ້ທີ່ເຂົ້າຮ່ວມໂຄງການ\r\n✅ລວມທະນາຄານທີ່ເຂົ້າຮ່ວມເປັນສະມາຊິກ LAPNet ໄດ້ເຖິງ 18 ທະນາຄານ ແລະ 2 ຜູ້ໃຫ້ບໍລິການກະເປົາເງິນອີເລັກໂຕຣນິກ ທີ່ບໍ່ແມ່ນທະນາຄານ.', '/uploads/news/news_hero_1767582238751_666230246.webp', '[]', '2026-01-05 03:03:58', '2026-01-05 03:03:58'),
(14, '📣QR ດຽວຊຳລະໄດ້ທຸກທະນາຄານທົ່ວປະເທດລາວ🔔', 'Announcement', '2025-08-07 00:00:00', NULL, '[\"Announcement\", \"LAPNet\", \"AnywhereAnytimeAnypaymentchannel\"]', '📣QR ດຽວຊຳລະໄດ້ທຸກທະນາຄານທົ່ວປະເທດລາວ🔔\r\n✅ບໍ່ຕ້ອງມີຫຼາຍແອັບ ✅ບໍ່ຕ້ອງຖາມວ່າຮ້ານຄ້າໃຊ້ທະນາຄານຫຍັງ 🆗ພຽງສະແກນປ້າຍ QR ທີ່ເປັນ LAO QR ດ້ວຍແອັບໃດກໍຈ່າຍໄດ້  ຊຶ່ງບໍລິສັດ LAPNet ເປັນໂຕກາງໃນການເຊື່ອມທຸກທະນາຄານໃຫ້ທ່ານໃນຄລິກດຽວ 👈', '/uploads/news/news_hero_1767582322701_343806424.webp', '[]', '2026-01-05 03:05:22', '2026-01-05 03:07:31'),
(15, 'ກອງປະຊຸມຜູ້ຖືຮຸ້ນ ສະໄໝວິສາມັນ ຄັ້ງທີ 1 ປະຈຳປີ 2025 ຂອງບໍລິສັດ ລາວເນເຊີນນໍ ເພເມັ້ນ ເນັດເວີກ ຈຳກັດ. ຄັ້ງວັນທີ 18 ກໍລະກົດ 2025', 'Meeting', '2025-07-18 10:06:30', NULL, '[\"Meeting\", \"LAPNet\", \"AnywhereAnytimeAnypaymentchannel\"]', 'ກອງປະຊຸມຜູ້ຖືຮຸ້ນ ສະໄໝວິສາມັນ ຄັ້ງທີ 1 ປະຈຳປີ 2025 ຂອງບໍລິສັດ ລາວເນເຊີນນໍ ເພເມັ້ນ ເນັດເວີກ ຈຳກັດ.\r\nຄັ້ງວັນທີ 18 ກໍລະກົດ 2025', '/uploads/news/news_hero_1767582394236_230123256.webp', '[\"/uploads/news/gallery/news_gallery_1767582394236_825788581.webp\", \"/uploads/news/gallery/news_gallery_1767582394236_93947165.webp\", \"/uploads/news/gallery/news_gallery_1767582394237_931276458.webp\", \"/uploads/news/gallery/news_gallery_1767582394237_843612090.webp\"]', '2026-01-05 03:06:34', '2026-01-05 03:06:34'),
(16, '❌❌ລະວັງ! ການຫຼອກລວງທາງໂທລະສັບ ແລະ ອອນລາຍ 📢', 'Announcement', '2025-07-17 00:00:00', NULL, '[\"Announcement\", \"LAPNet\", \"ລະວັງຫຼອກລວງ\"]', '❌❌ລະວັງ! ການຫຼອກລວງທາງໂທລະສັບ ແລະ ອອນລາຍ 📢\r\nມີການຫຼອກລວງໃໝ່❎\r\nຜູ້ບໍ່ດີອ້າງຕົວວ່າເປັນພະນັກງານທະນາຄານ, ບໍລິສັດໂທລະຄົມ ຫລື ຫນ່ວຍງານຕ່າງໆ ໂທມາຂໍ ລະຫັດ OTP, ຂໍ້ມູນບັດ, ຫຼື ໃຫ້ກົດລິ້ງແປກໆ ເພື່ອເອົາເງິນຈາກບັນຊີທ່ານ!\r\n✅ ວິທີປ້ອງກັນ:\r\n1️⃣ ຢ່າໃຫ້ລະຫັດຜ່ານ, ລະຫັດ OTP, ເລກບັດສຳຄັນ ກັບຄົນທີ່ໂທມາຂໍ\r\n2️⃣ ຢ່າກົດ ລິ້ງແປກໆ ໃນຂໍ້ຄວາມ ຫຼື ເອກະສານໃດໆ ທີ່ສົ່ງເຂົ້າມາ\r\n3️⃣ ຕິດຕໍ່ພາກສ່ວນກ່ຽວຂ້ອງໂດຍກົງ ຖ້າມີຂໍ້ສົງໄສ ຜ່ານເບີສາຍດ່ວນ\r\n4️⃣ ລາຍງານຕຳຫຼວດ ຖ້າເກີດການຫຼອກລວງ.\r\n📌 ເບີໂທລະສັບທີ່ຕ້ອງລະວັງ:\r\nເບີແປກໆ ທີ່ອ້າງວ່າມາຈາກທະນາຄານ, ອ້າງວ່າເປັນພະນັກງານໂທລະຄົມໃຫ້ລົງທະບຽນເບີ\r\nສອບຖາມຂໍ້ມູນເພີ່ມຕື່ມໂທ: 021 417915', '/uploads/news/news_hero_1767582782056_617906768.webp', '[]', '2026-01-05 03:13:02', '2026-01-16 02:25:28'),
(17, 'ຊຳລະຂ້າມທະນາຄານໄດ້ທັນທີ ! ພຽງສະແກນ Lao QR', 'Announcement', '2025-07-15 13:03:31', NULL, '[\"Announcement\", \"LAPNet\", \"ທຸກທີ່ທຸກເວລາທຸກຊ່ອງທາງການຊຳລະ\"]', 'ຊຳລະຂ້າມທະນາຄານໄດ້ທັນທີ ! ພຽງສະແກນ Lao QR\r\nບໍ່ຕ້ອງມີຫຼາຍແອັບ ບໍ່ຕ້ອງຖາມຮ້ານຄ້າວ່າໃຊ້ທະນາຄານໃດ ພຽງສະແກນ QR ຮ້ານຄ້າຂອງທະນາຄານໃດກໍ່ໄດ້ ທີ່ມີສັນຍາລັກ Lao QR\r\n✅ຮອງຮັບການສະແກນຈາກທຸກທະນາຄານທີ່ເຂ້າຮ່ວມ\r\n✅ບໍ່ຕ້ອງຖືເງິນສົດ', '/uploads/news/news_hero_1767593012355_842358305.webp', '[]', '2026-01-05 06:03:32', '2026-01-05 06:03:32'),
(18, 'ໂອນເງິນງ່າຍບໍ່ຕ້ອງໃຊ້ເງິນສົດ! ພຽງແຕ່ມີບັນຊີທະນາຄານ ກໍໂອນໄດ້ທຸກທະນາຄານຜ່ານ LAPNet', 'Announcement', '2025-07-14 13:04:57', NULL, '[\"Announcement\", \"LAPNet\", \"ທຸກທີ່ທຸກເວລາທຸກຊ່ອງທາງການຊຳລະ\"]', 'ໂອນເງິນງ່າຍບໍ່ຕ້ອງໃຊ້ເງິນສົດ! ພຽງແຕ່ມີບັນຊີທະນາຄານ ກໍໂອນໄດ້ທຸກທະນາຄານຜ່ານ LAPNet\r\nສະແກນປຸ໊ບ ປາຍທາງໄດ້ຮັບເງິນທັນທີບໍ່ຕ້ອງໃຊ້ເງິນສົດ! ພຽງແຕ່ມີບັນຊີທະນາຄານ ກໍໂອນໄດ້ທຸກທະນາຄານຜ່ານ LAPNet ຊີວິດງ່າຍຂຶ້ນ ສະດວກ ປອດໄພ', '/uploads/news/news_hero_1767593097962_417467372.webp', '[]', '2026-01-05 06:04:57', '2026-01-05 06:04:57'),
(19, 'ຊຳລະຂ້າມແດນ ລາວ 🇱🇦 ສະແກນ ໄທ 🇹🇭', 'Announcement', '2025-07-07 13:06:40', NULL, '[\"Announcement\", \"LAPNet\", \"CrossborderQRpayment\"]', 'ຊຳລະຂ້າມແດນ ລາວ 🇱🇦 ສະແກນ ໄທ 🇹🇭\r\n✅ບັນຊີເງິນກີບ ກໍ່ສະແກນຄິວອາຮ້ານຄ້າ ທີ່ມີສັນຍາລັກ QR Prompay Cross-Border QR payment\r\n✅ອັດຕາແລກປ່ຽນທະນາຄານ\r\n✅ພຽງແຕ່ມີແອັບຂອງທະນາຄານລຸ່ມນີ້ກໍ່ສາມາດສະແກນຊຳລະຄ່າສິນຄ້າບໍລິການໃນປະເທດໄທໄດ້\r\n1. ທະນາຄານ ການຄ້າຕ່າງປະເທດລາວ ມະຫາຊົນ (BCEL)\r\n2. ທະນາຄານ ສົ່ງເສີມກະສິກໍາ ຈຳກັດ (APB)\r\n3. ທະນາຄານ ຮ່ວມພັດທະນາ ມະຫາຊົນ (JDB)\r\n4. ທະນາຄານ ຮ່ວມທຸລະກິດ ລາວ-ຫວຽດ (LVB)\r\n5. ທະນາຄານ ເອັສທີ ຈຳກັດ (STB)\r\n6. ທະນາຄານ ເອຊີລີດາລາວ ຈໍາກັດ (ACLEDA)\r\n7. ທະນາຄານ ພົງສະຫວັນ ຈໍາກັດ (PSVB)', '/uploads/news/news_hero_1767593201540_685175904.webp', '[]', '2026-01-05 06:06:41', '2026-01-05 06:06:41'),
(20, 'ກອງປະຊຸມສະມາຊິກ ປະຈຳປີ 2025 ຄັ້ງທີ I', 'Meeting', '2025-06-30 13:08:24', NULL, '[\"Meeting\"]', 'ໃນກາງເດືອນມິຖຸນາ 2025 ທີ່ຜ່ານມາ ບໍລິສັດ LAPNet ໄດ້ຈັດກອງປະຊຸມຮ່ວມກັບສະມາຊິກທັງໝົດເຊັ່ນ: ທະນາຄານ, ຜູ້ໃຫ້ບໍລິການເງິນອີເລັກໂທຣນິກ ແລະ ຕະຫຼາດແລກປ່ຽນເງິນຕາ LFX ເພື່ອປຶກສາຫາລືບັນຫາ ແລະ ການກຳນົດແນວທາງການແກ້ໄຂໃນຕໍ່ໜ້າ ກ່ຽວກັບການໃຫ້ບໍລິການລະຫວ່າງສະມາຊິກ.\r\nໂດຍການເປັນປະທານຂອງທ່ານ ສີສະໝອນ ສຣິດທິຣາດ ຜູ້ອຳນວຍການບໍລິສັດ LAPNet.', '/uploads/news/news_hero_1767593304963_707299047.webp', '[\"/uploads/news/gallery/news_gallery_1767593304964_615311567.webp\", \"/uploads/news/gallery/news_gallery_1767593304964_243107925.webp\", \"/uploads/news/gallery/news_gallery_1767593304965_466549019.webp\", \"/uploads/news/gallery/news_gallery_1767593304965_684906709.webp\", \"/uploads/news/gallery/news_gallery_1767593304965_796173224.webp\", \"/uploads/news/gallery/news_gallery_1767593304965_660343504.webp\", \"/uploads/news/gallery/news_gallery_1767593305005_292523999.webp\"]', '2026-01-05 06:08:25', '2026-01-05 06:08:25'),
(21, 'ໃນວັນທີ 19 ພຶດສະພາ 2025 ທີ່ຜ່ານມາ, ບໍລິສັດ LAPNet ໄດ້ຈັດກອງປະຊຸມສະພາບໍລິຫານ ສະໄໝສາມັນ ປະຈຳໄຕມາດ I ປີ 2025 ເພື່ອສະຫຼຸບຜົນການດຳເນີນທຸລະກິດ ແລະ ກຳນົດທິດທາງແຜນໃນໄຕມາດຕໍ່ໄປ;', 'Meeting', '2025-05-19 13:10:43', NULL, '[\"Meeting\"]', 'ໃນວັນທີ 19 ພຶດສະພາ 2025 ທີ່ຜ່ານມາ, ບໍລິສັດ LAPNet ໄດ້ຈັດກອງປະຊຸມສະພາບໍລິຫານ ສະໄໝສາມັນ ປະຈຳໄຕມາດ I ປີ 2025 ເພື່ອສະຫຼຸບຜົນການດຳເນີນທຸລະກິດ ແລະ ກຳນົດທິດທາງແຜນໃນໄຕມາດຕໍ່ໄປ;\r\nໂດຍການເປັນປະທານ ກອງປະຊຸມ ຂອງທ່ານ ມະໂນລິດ ຊຸມພົນພັກດີ ປະທານສະພາບໍລິຫານ ພ້ອມດ້ວຍຄະນະກຳມະການ, ສະມາຊິກສະພາບໍລິຫານ ແລະ ຄະນະອຳນວຍການຂອງບໍລິສັດ LAPNet ກໍ່ໄດ້ເຂົ້າຮ່ວມ.', '/uploads/news/news_hero_1767593444392_818533682.webp', '[\"/uploads/news/gallery/news_gallery_1767593444394_450402606.webp\", \"/uploads/news/gallery/news_gallery_1767593444394_929184235.webp\", \"/uploads/news/gallery/news_gallery_1767593444395_365267964.webp\", \"/uploads/news/gallery/news_gallery_1767593444395_843092013.webp\", \"/uploads/news/gallery/news_gallery_1767593444395_463642000.webp\", \"/uploads/news/gallery/news_gallery_1767593444395_643339637.webp\"]', '2026-01-05 06:10:44', '2026-01-05 06:10:44'),
(22, 'ພາບບັນຍາກາດງານ ສະເຫຼີມສະຫຼອງ ບຸນປີໃຫມ່ລາວ ພສ 2568 ຂອງບໍລິສັດ LAPNet  💦🌼🌸🌺.', 'Activity', '2025-04-23 00:00:00', NULL, '[\"Activity\", \"LNY2025\"]', 'ພາບບັນຍາກາດງານ ສະເຫຼີມສະຫຼອງ ບຸນປີໃຫມ່ລາວ ພສ 2568 ຂອງບໍລິສັດ LAPNet  💦🌼🌸🌺', '/uploads/news/news_hero_1767593532707_264396258.webp', '[\"/uploads/news/gallery/news_gallery_1767593532716_961170204.webp\", \"/uploads/news/gallery/news_gallery_1767593532720_432530863.webp\"]', '2026-01-05 06:12:12', '2026-01-06 04:34:34'),
(23, 'ໃນວັນທີ 22 - 23 ກຸມພາ 2025 ທີ່ຜ່ານມາ ບໍລິສັດ LAPNet ໄດ້ນຳພາທີມງານ ທ່ຽວປະຈຳປີ 2025 ທີ່ ນະຄອນຫຼວງພະບາງ ເພື່ອເສີມສ້າງຄວາມສາມັກຄີພາຍໃນອົງກອນ ໃຫ້ມີຄວາມເຂັ້ມແຂງ.', 'Activity', '2025-02-22 13:14:16', NULL, '[\"Activity\", \"LAPNet\", \"Teambuilding2025\"]', 'ໃນວັນທີ 22 - 23 ກຸມພາ 2025 ທີ່ຜ່ານມາ ບໍລິສັດ LAPNet ໄດ້ນຳພາທີມງານ ທ່ຽວປະຈຳປີ 2025 ທີ່ ນະຄອນຫຼວງພະບາງ ເພື່ອເສີມສ້າງຄວາມສາມັກຄີພາຍໃນອົງກອນ ໃຫ້ມີຄວາມເຂັ້ມແຂງ.', '/uploads/news/news_hero_1767593657534_797064940.webp', '[\"/uploads/news/gallery/news_gallery_1767593657544_809375456.webp\", \"/uploads/news/gallery/news_gallery_1767593657550_420223166.webp\", \"/uploads/news/gallery/news_gallery_1767593657559_639935020.webp\", \"/uploads/news/gallery/news_gallery_1767593657568_484235251.webp\", \"/uploads/news/gallery/news_gallery_1767593657573_290175148.webp\", \"/uploads/news/gallery/news_gallery_1767593657580_979195093.webp\", \"/uploads/news/gallery/news_gallery_1767593657583_827261017.webp\", \"/uploads/news/gallery/news_gallery_1767593657585_440637392.webp\"]', '2026-01-05 06:14:17', '2026-01-05 06:14:17'),
(24, 'ບໍລິສັດ LAPNet ໄດ້ຈັດກອງປະຊຸມສະພາບໍລິຫານ ສະໄໝສາມັນ ປະຈຳໄຕມາດ IV ປະຈຳປີ 2024 ແລະ ກອງປະຊຸມຜູ້ຖືຮຸ້ນ ສະໄໝສາມັນ ປະຈຳປີ 2025.', 'Meeting', '2025-02-14 13:15:25', NULL, '[\"Meeting\"]', 'ໃນວັນທີ 14 ກຸມພາ 2025 ທີ່ຜ່ານມາ, ບໍລິສັດ LAPNet ໄດ້ຈັດກອງປະຊຸມສະພາບໍລິຫານ ສະໄໝສາມັນ ປະຈຳໄຕມາດ IV ປະຈຳປີ 2024 ແລະ ກອງປະຊຸມຜູ້ຖືຮຸ້ນ ສະໄໝສາມັນ ປະຈຳປີ 2025 ເພື່ອສະຫຼຸບຜົນການດຳເນີນທຸລະກິດປະຈຳປີ 2024 ແລະ ກຳນົດທິດທາງແຜນປີ 2025;\r\nໂດຍການເປັນປະທານ ກອງປະຊຸມ ຂອງທ່ານ ມະໂນລິດ ຊຸມພົນພັກດີ ປະທານສະພາບໍລິຫານ ເຂົ້າຮ່ວມໂດຍຄະນະກຳມະການສະພາບໍລິຫານ ແລະ ຄະນະບໍລິຫານຂອງບໍລິສັດ', '/uploads/news/news_hero_1767593726453_745653047.webp', '[\"/uploads/news/gallery/news_gallery_1767593726453_647464206.webp\", \"/uploads/news/gallery/news_gallery_1767593726453_100560547.webp\", \"/uploads/news/gallery/news_gallery_1767593726454_750933586.webp\", \"/uploads/news/gallery/news_gallery_1767593726454_86995222.webp\", \"/uploads/news/gallery/news_gallery_1767593726455_947761314.webp\"]', '2026-01-05 06:15:26', '2026-01-05 06:15:26'),
(25, 'ກອງປະຊຸມ ຄັ້ງທີ 47 ( JC 47 ).', 'Meeting', '2025-01-09 13:17:56', NULL, '[\"Meeting\", \"LAOQR\", \"QRcrossborderpayment\", \"LAPNet\", \"ທຸກທີ່ທຸກເວລາທຸກຊ່ອງທາງການຊຳລະ\"]', 'ໃນວັນທີ 09 ມັງກອນ 2025, ໃນຊ່ວງໄລຍະກອງປະຊຸມ ຄັ້ງທີ 47 (JC 47) ຂອງຄະນະກໍາມະການຮ່ວມມືທະວີພາຄີລະຫວ່າງລັດຖະບານ ສປປ ລາວ ແລະ ສສ ຫວຽດນາມ ປະຈຳປີ 2025, ພະນະທ່ານ ສອນໄຊ ສີພັນດອນ, ກົມການເມືອງສູນກາງພັກ, ນາຍົກລັດຖະມົນຕີແຫ່ງ ສປປ ລາວ ແລະ ພະນະທ່ານ ຟ້າມ ມິງ ຈິ່ງ, ກົມການເມືອງສູນກາງພັກ, ນາຍົກລັດຖະມົນຕີແຫ່ງ ສສ ຫວຽດນາມ ກໍໄດ້ໃຫ້ກຽດເຂົ້າຮ່ວມເປັນປະທານເປີດໂຕການໃຫ້ບໍລິການ *ການເຊື່ອມຕໍ່ລະບົບການຊໍາລະຍ່ອຍຂ້າມແດນ ໃນຮູບແບບ QR Code ລະຫວ່າງ ສປປ ລາວ ແລະ ສສ ຫວຽດນາມ*\r\nພ້ອມນັ້ນ ທ່ານ ສຸລິສັກ ທຳນຸວົງ ຮອງຜູ້ວ່າການ ທະນາຄານແຫ່ງ ສປປ ລາວ, ທ່ານ ຟາມ ຕຽນ ຊຸງ ຮອງຜູ້ວ່າການ ທະນາຄານ ແຫ່ງ ລັດ ຫວຽດນາມ, ທ່ານ ມະໂນລິດ ຊຸມພົນພັກດີ ປະທານສະພາບໍລິຫານບໍລິສັດ LAPNet ແລະ ທ່ານ ຫງຽນ ກວາງ ຮຶງ ປະທານບໍລິສັດ NAPAS ພ້ອມດ້ວຍຄະນະລັດຖະມົນຕີຂອງສອງປະເທດກໍໃຫ້ກຽດເຂົ້າຮ່ວມເປີດໂຕພິທີດັ່ງກ່າວ.\r\nຊຶ່ງໂຄງການດັ່ງກ່າວຖືວ່າເປັນຂີດໝາຍ ແລະ ບາດກ້າວສໍາຄັນຂອງສອງປະເທດ ໃນການຊຸກຍູ້ ສົ່ງເສີມດ້ານເສດຖະກິດ ແລະ ການນຳໃຊ້ສະກຸນເງິນທ້ອງຖິ່ນ ກີບ - ດົງ ລະຫວ່າງສອງປະເທດ.ສຳລັບໂຄງການການເຊື່ອມຕໍ່ລະບົບການຊໍາລະຍ່ອຍຂ້າມແດນ ໃນຮູບແບບ QR Code ລະຫວ່າງ ສປປ ລາວ ແລະ ສສ. ຫວຽດນາມ ແມ່ນໄດ້ແຕ່ງຕັ້ງ ທະນາຄານ ຫວຽດຕິນ ລາວ ຈໍາກັດ ເປັນ ທະນາຄານຫັກບັນຊີ (Settlement Bank) ເບື້ອງ ສປປ ລາວ ແລະ ໄດ້ແບ່ງອອກເປັນ 02 ໄລຍະ ຄື:\r\nໄລຍະທີ 1: ສສ. ຫວຽດນາມ ສະແກນ ສປປ ລາວ: ນັບແຕ່ມື້ນີ້ ວັນທີ 09 ມັງກອນ 2025 ເປັນຕົ້ນໄປ, ນັກທ່ອງທຽວຈາກ ສສ ຫວຽດນາມ ທີ່ເດີນທາງມາ ສປປ ລາວ ສາມາດໃຊ້ Mobile Banking Application ຂອງຕົນ ທີ່ເປີດບັນຊີໄວ້ກັບທະນາຄານທຸລະກິດຢູ່ ສສ ຫວຽດນາມ ຈຳນວນ 07 ທະນາຄານ ທີ່ເຂົ້າຮ່ວມໂຄງການ ຄື: VTB VN, SACOM, BIDV, VCB, TPBank, BVBank, ແລະ Nam A Bank ສາມາດມາຊໍາລະຄ່າສິນຄ້າ ແລະ ບໍລິການຕ່າງໆກັບຮ້ານຄ້າ ທີ່ມີ QR Code ຂອງທະນາຄານທຸລະກິດ ໃນສປປ ລາວ ທັງໝົດມີ 14 ທະນາຄານ ຄື: BCEL, APB, LDB, BIC, JDB, LVB, STB, VTBL, ABL, IDB, MJBL, MBL, PSVB, ແລະ SACOM ທີ່ເຂົ້າຮ່ວມໃຫ້ບໍລິການຮັບຊໍາລະໃນເບື້ອງຕົ້ນນີ້;\r\nໄລຍະທີ 2: ສປປ ລາວ ສະແກນ ສສ. ຫວຽດນາມ: ສຳລັບການຊຳລະເງິນ ຢູ່ຮ້ານຄ້າໃນ ສສ.ຫວຽດນາມ ດ້ວຍ QR Code ຈາກ Mobile Banking Application ຂອງ ສປປ ລາວ ແມ່ນຈະໃຫ້ສຳເລັດການພັດທະນາລະບົບ ແລະ ເປີດໃຫ້ບໍລິການ ຫລັງໄຕມາດ 3 ປີ 2025. ພວກເຮົາສັນຍາວ່າຈະນໍາເອົາຄວາມກ້າວຫນ້າຂອງການຊຳລະໂດຍການນຳໃຊ້ສະກຸນເງິນທ້ອງຖິ່ນ ເຕັກໂນໂລຊີທີ່ກ້າວໜ້າ, ຮັບປະກັນການເຮັດທຸລະກຳທີ່ສະດວກ, ວ່ອງໄວ ແລະ ປອດໄພ, ຍົກລະດັບປະສົບການຂອງລູກຄ້າ ແລະ ປະສິດທິພາບທາງທຸລະກິດໃຫ້ແກ່ປະຊາຊົນທັງສອງປະເທດ. ຂໍຂອບໃຈ', '/uploads/news/news_hero_1767593877466_161508298.webp', '[\"/uploads/news/gallery/news_gallery_1767593877482_879367617.webp\", \"/uploads/news/gallery/news_gallery_1767593877496_433270174.webp\", \"/uploads/news/gallery/news_gallery_1767593877496_52740158.webp\", \"/uploads/news/gallery/news_gallery_1767593877499_466368839.webp\", \"/uploads/news/gallery/news_gallery_1767593877499_747223125.webp\", \"/uploads/news/gallery/news_gallery_1767593877500_725992137.webp\", \"/uploads/news/gallery/news_gallery_1767593877500_396027254.webp\", \"/uploads/news/gallery/news_gallery_1767593877500_963855525.webp\"]', '2026-01-05 06:17:57', '2026-01-05 06:17:57');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `idnotification` int NOT NULL,
  `entity` varchar(32) NOT NULL,
  `action` varchar(24) NOT NULL,
  `ref_id` int DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `message` varchar(255) DEFAULT NULL,
  `payload` json DEFAULT NULL,
  `linkpath` varchar(255) DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `read_time` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`idnotification`, `entity`, `action`, `ref_id`, `title`, `message`, `payload`, `linkpath`, `is_read`, `time`, `read_time`) VALUES
(11, 'member', 'insert', 39, 'Member created', 'Created member bank: Test bank count - Test bank count', '{\"Bankcode\": \"Test bank count\", \"idmember\": 39, \"BanknameEN\": \"Test bank count\", \"BanknameLA\": \"Test bank count\"}', '/members', 1, '2026-01-21 15:34:42', '2026-01-21 16:06:46'),
(12, 'member', 'insert', 40, 'Member created', 'Created member bank: SFT - ບໍລິສັດ ສະຕາ ຟິນເທັກ ຈຳກັດຜູ້ດຽວ (SFT)', '{\"Bankcode\": \"SFT\", \"idmember\": 40, \"BanknameEN\": \"Umoney\", \"BanknameLA\": \"ບໍລິສັດ ສະຕາ ຟິນເທັກ ຈຳກັດຜູ້ດຽວ (SFT)\"}', '/members', 1, '2026-01-21 15:58:53', '2026-01-21 16:06:43'),
(13, 'member', 'insert', 41, 'Member created', 'Created member bank: LBB - ທະນາຄານຄຳ', '{\"Bankcode\": \"LBB\", \"idmember\": 41, \"BanknameEN\": \"LBB\", \"BanknameLA\": \"ທະນາຄານຄຳ\"}', '/members', 0, '2026-01-23 15:44:33', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint UNSIGNED NOT NULL,
  `username` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('admin','staff','viewer') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'viewer',
  `bankcode` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password_hash`, `role`, `bankcode`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'admin1', '$2b$10$aqWh4iFwzQ00A1eP22/50eW/n9oejtsKDpxDHgWKAQ08ljhkmQKk2', 'admin', '0', 1, '2026-01-16 04:21:13', '2026-01-21 08:55:13'),
(13, 'BCEL', '$2b$10$mSJPwWkCTRIaqgwedsklmOqVyvoaai13xzjKPnY9ZJZH4SUCP0Cu6', 'viewer', 'BCEL', 1, '2026-01-26 06:02:27', '2026-01-26 06:02:27'),
(14, 'APB', '$2b$10$GMvWbec1z82AFOFRGe3rEOY2ezxK6DeVCgZgjV.di0cdsOv4sOwR6', 'viewer', 'APB', 1, '2026-01-26 06:13:43', '2026-01-26 06:13:43'),
(16, 'KBANK', '$2b$10$guf4bHs9mysi79EVcH8R5.1/9ywedDMYAVfjITfIQYPAMVbLB6cMW', 'viewer', 'KBANK', 1, '2026-01-27 06:25:11', '2026-01-27 09:12:20'),
(17, 'JDB', '$2b$10$Xwv9X2kbt3r.2294VKPgjuOxdBAyKozhKQ3yYtoccW/Y5gbcGpv6.', 'viewer', 'JDB', 1, '2026-01-27 09:11:51', '2026-01-27 09:11:51');

-- --------------------------------------------------------

--
-- Table structure for table `visitors_events`
--

CREATE TABLE `visitors_events` (
  `id` bigint UNSIGNED NOT NULL,
  `occurred_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `session_id` varchar(36) NOT NULL,
  `ip` varchar(45) DEFAULT NULL,
  `country_code` char(2) DEFAULT NULL,
  `country_name` varchar(64) DEFAULT NULL,
  `path` varchar(255) DEFAULT NULL,
  `referrer` text,
  `user_agent` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `visitors_events`
--

INSERT INTO `visitors_events` (`id`, `occurred_at`, `session_id`, `ip`, `country_code`, `country_name`, `path`, `referrer`, `user_agent`) VALUES
(1, '2026-01-11 20:54:37', '87ad7dda-aa75-4ee8-b379-2deeae352d2e', '::1', NULL, NULL, NULL, 'http://localhost:5173/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'),
(2, '2026-01-11 20:55:00', '270f682a-f292-4149-858b-78f363162b6e', '::1', NULL, NULL, NULL, 'http://localhost:5173/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'),
(5, '2026-01-11 21:15:42', '1ed7da0d-37cc-4c75-8175-ead23502c898', '::1', NULL, NULL, NULL, 'http://localhost:5173/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'),
(6, '2026-01-11 21:20:36', '48318c5c-9d28-4bc4-ab58-f42f1168ae2c', '::1', NULL, NULL, NULL, 'http://localhost:5173/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'),
(7, '2026-01-11 21:42:45', 'a86e5e9e-3085-4171-8925-49679603577b', '::1', NULL, NULL, NULL, 'http://localhost:5173/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'),
(8, '2026-01-11 22:13:34', '5dd2cc3a-89aa-47a9-bcee-5d7b632efd3b', '::1', NULL, NULL, NULL, 'http://localhost:5173/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'),
(9, '2026-01-11 22:32:38', 'cbc38535-0fde-4339-bdc9-e7c574eb1954', '::1', NULL, NULL, NULL, 'http://localhost:5173/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'),
(10, '2026-01-12 08:24:59', 'd3aaae9f-b4fb-45bf-8a1f-8a997277bbf0', '::1', NULL, NULL, NULL, 'http://localhost:5173/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'),
(11, '2026-01-12 08:43:05', '52676b19-54fa-4490-a651-e9a4bb1193cb', '::1', NULL, NULL, NULL, 'http://localhost:5173/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'),
(12, '2026-01-12 08:48:50', '96c14d33-0e92-4601-91f7-d05a4e74fa38', '::1', NULL, NULL, NULL, 'http://localhost:5173/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'),
(13, '2026-01-12 10:29:57', '9fedf8e3-2847-4ffd-9162-0b1e093498bf', '::1', NULL, NULL, NULL, 'http://localhost:5173/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'),
(14, '2026-01-12 11:10:09', '33f91155-567d-4d4e-a367-5bef53b956cc', '::1', NULL, NULL, NULL, 'http://localhost:5173/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'),
(15, '2026-01-12 11:19:37', '9a5140c8-0331-468f-9813-80edb1280633', '::1', NULL, NULL, NULL, NULL, 'PostmanRuntime/7.49.1'),
(16, '2026-01-12 13:04:38', '5d666c95-e75a-4c76-a70a-f31bfad72287', '::1', NULL, NULL, NULL, 'http://localhost:5173/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'),
(17, '2026-01-12 13:20:18', 'aaf7d151-d8ac-4d33-9bb1-d1ec8af9506c', '::1', NULL, NULL, NULL, 'http://localhost:5173/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'),
(18, '2026-01-12 15:38:22', '1974cd7d-af83-48a4-a715-7c7ea0ae69b5', '::1', NULL, NULL, NULL, 'http://localhost:5173/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'),
(19, '2026-01-12 21:46:13', '099442dd-d1cf-4a8d-928c-7ee4d53636e9', '::1', NULL, NULL, NULL, 'http://localhost:5173/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'),
(20, '2026-01-12 21:46:13', '5d967eac-3310-491c-9217-a703b52f81a5', '::1', NULL, NULL, NULL, 'http://localhost:5173/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'),
(21, '2026-01-13 08:34:10', '9c353ea0-6892-4b76-b0f0-c65cc9228323', '::1', NULL, NULL, NULL, 'http://localhost:5173/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'),
(22, '2026-01-13 13:25:10', 'f2100bd7-8deb-4458-9627-4da893f7ace8', '::1', NULL, NULL, NULL, 'http://localhost:5173/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'),
(23, '2026-01-14 08:15:38', '4ca697c1-cea8-49cf-ad64-9b9801ef6055', '::1', NULL, NULL, NULL, 'http://localhost:5173/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'),
(24, '2026-01-14 13:28:19', 'a0238535-915a-44ad-b231-28ab5c21288e', '::1', NULL, NULL, NULL, 'http://localhost:5173/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'),
(25, '2026-01-14 16:42:56', '46998e97-110c-4dad-a892-cb79b92942c6', '::1', NULL, NULL, NULL, 'http://localhost:5173/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'),
(26, '2026-01-15 09:55:15', '876601f3-7e9d-4402-a5d8-fbea985cf72a', '::1', NULL, NULL, NULL, 'http://localhost:5173/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'),
(27, '2026-01-15 16:09:55', 'a403a09b-d4eb-46fe-8157-617242cce813', '::1', NULL, NULL, NULL, 'http://localhost:5173/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'),
(28, '2026-01-15 16:22:12', '7251489f-35e5-4ac2-b036-0a3c1eea4f22', '::1', NULL, NULL, NULL, 'http://localhost:5173/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'),
(29, '2026-01-16 08:25:27', '14728ae8-4b2e-4d79-9c3e-857fb032d40d', '::1', NULL, NULL, NULL, 'http://localhost:5173/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'),
(30, '2026-01-16 10:27:36', '855f8d9b-0df7-4ab3-9c78-5d74863a4b44', '::1', NULL, NULL, NULL, 'http://localhost:5173/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'),
(31, '2026-01-16 10:29:40', '9db300cc-9393-40dc-95a3-c34b771cc417', '::1', NULL, NULL, NULL, 'http://localhost:5173/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'),
(32, '2026-01-16 10:29:44', '2d0d436a-176a-4c19-a098-f9736fa82b11', '::1', NULL, NULL, NULL, 'http://localhost:5173/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'),
(33, '2026-01-16 10:34:22', '6aa1e87f-576f-48d8-9e6a-850bdda67724', '::1', NULL, NULL, NULL, 'http://localhost:5173/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'),
(34, '2026-01-16 15:17:22', 'a8d551a0-cd7f-46ce-bdd4-8a474ad188a3', '::1', NULL, NULL, NULL, 'http://localhost:5173/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'),
(35, '2026-01-16 15:47:40', '80dd23ba-6bf3-435b-9312-e6aa022a3a5b', '::1', NULL, NULL, NULL, 'http://localhost:5173/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'),
(36, '2026-01-16 16:33:12', '5b09144f-99e4-4076-979c-c0f5176447bc', '::1', NULL, NULL, NULL, 'http://localhost:5173/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'),
(37, '2026-01-17 06:44:45', 'e620dc65-e980-41c3-866d-df3fd7bbe6e3', '::1', NULL, NULL, NULL, 'http://localhost:5173/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'),
(38, '2026-01-20 15:00:22', 'c20e22c0-4ab5-42a0-a25a-ab7b81f4c543', '::1', NULL, NULL, NULL, 'http://localhost:5174/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'),
(39, '2026-01-20 16:40:44', '0c5bec42-7349-4ed4-b761-c00d8dc1b226', '::1', NULL, NULL, NULL, 'http://localhost:5174/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'),
(40, '2026-01-21 15:32:08', '1717f273-8f30-467b-a0c9-865ddf51046b', '::1', NULL, NULL, NULL, 'http://localhost:5174/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'),
(41, '2026-01-21 15:36:33', '1258a609-6e5f-4c2d-9b73-61b7cb41b20d', '::1', NULL, NULL, NULL, 'http://localhost:5174/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'),
(42, '2026-01-21 15:59:41', 'd84be8c7-f668-4395-9093-56bdb85a2b73', '::1', NULL, NULL, NULL, 'http://localhost:5174/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'),
(43, '2026-01-21 15:59:42', 'ee5f2874-bdcb-4d26-a6b5-bbc1d3acd1e6', '::1', NULL, NULL, NULL, 'http://localhost:5174/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'),
(44, '2026-01-21 16:07:06', 'c63c78d3-e4a0-418a-b7fa-bc3200a2d42f', '::1', NULL, NULL, NULL, 'http://localhost:5174/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'),
(45, '2026-01-22 13:30:53', 'f9c5d2f2-7d84-431a-929f-a74adef8fb1b', '::1', NULL, NULL, NULL, 'http://localhost:5175/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'),
(46, '2026-01-23 10:04:04', '4df11a41-ff11-4fc7-b8d9-27a42c6eb318', '::1', NULL, NULL, NULL, 'http://localhost:5174/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'),
(47, '2026-01-23 11:28:13', 'e9a9afd9-9bcb-4d82-abb6-52f9f1219923', '::1', NULL, NULL, NULL, 'http://localhost:5174/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'),
(48, '2026-01-23 11:34:28', '51b8ff49-702f-4c57-b9da-621cd03d92e1', '::1', NULL, NULL, NULL, 'http://localhost:5174/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'),
(49, '2026-01-23 15:44:53', '2f72109f-1322-4708-acf7-271673a6e825', '::1', NULL, NULL, NULL, 'http://localhost:5174/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'),
(50, '2026-01-29 11:01:31', '0097c21c-31ff-46f9-81b3-40f0dd9bd20d', '::1', NULL, NULL, NULL, 'http://localhost:5174/', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36');

-- --------------------------------------------------------

--
-- Table structure for table `visitors_sessions`
--

CREATE TABLE `visitors_sessions` (
  `session_id` varchar(36) NOT NULL,
  `first_seen_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_seen_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ip` varchar(45) DEFAULT NULL,
  `country_code` char(2) DEFAULT NULL,
  `country_name` varchar(64) DEFAULT NULL,
  `user_agent` text,
  `pageviews` int UNSIGNED NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `visitors_sessions`
--

INSERT INTO `visitors_sessions` (`session_id`, `first_seen_at`, `last_seen_at`, `ip`, `country_code`, `country_name`, `user_agent`, `pageviews`) VALUES
('0097c21c-31ff-46f9-81b3-40f0dd9bd20d', '2026-01-29 11:01:31', '2026-01-29 11:01:31', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36', 1),
('099442dd-d1cf-4a8d-928c-7ee4d53636e9', '2026-01-12 21:46:13', '2026-01-12 21:46:13', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 1),
('0c5bec42-7349-4ed4-b761-c00d8dc1b226', '2026-01-20 16:40:44', '2026-01-20 16:40:44', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36', 1),
('1258a609-6e5f-4c2d-9b73-61b7cb41b20d', '2026-01-21 15:36:33', '2026-01-21 15:36:33', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36', 1),
('14728ae8-4b2e-4d79-9c3e-857fb032d40d', '2026-01-16 08:25:27', '2026-01-16 08:25:27', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 1),
('1717f273-8f30-467b-a0c9-865ddf51046b', '2026-01-21 15:32:08', '2026-01-21 15:32:08', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36', 1),
('1974cd7d-af83-48a4-a715-7c7ea0ae69b5', '2026-01-12 15:38:22', '2026-01-12 15:38:22', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15', 1),
('1ed7da0d-37cc-4c75-8175-ead23502c898', '2026-01-11 21:15:42', '2026-01-11 21:15:42', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 1),
('270f682a-f292-4149-858b-78f363162b6e', '2026-01-11 20:55:00', '2026-01-11 20:55:00', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 1),
('2d0d436a-176a-4c19-a098-f9736fa82b11', '2026-01-16 10:29:44', '2026-01-16 10:29:44', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 1),
('2f72109f-1322-4708-acf7-271673a6e825', '2026-01-23 15:44:53', '2026-01-23 15:44:53', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36', 1),
('33f91155-567d-4d4e-a367-5bef53b956cc', '2026-01-12 11:10:09', '2026-01-12 11:10:09', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 1),
('46998e97-110c-4dad-a892-cb79b92942c6', '2026-01-14 16:42:55', '2026-01-14 16:42:55', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 1),
('48318c5c-9d28-4bc4-ab58-f42f1168ae2c', '2026-01-11 21:20:35', '2026-01-11 21:20:35', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 1),
('4ca697c1-cea8-49cf-ad64-9b9801ef6055', '2026-01-14 08:15:38', '2026-01-14 08:15:38', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 1),
('4df11a41-ff11-4fc7-b8d9-27a42c6eb318', '2026-01-23 10:04:04', '2026-01-23 10:04:04', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36', 1),
('51b8ff49-702f-4c57-b9da-621cd03d92e1', '2026-01-23 11:34:28', '2026-01-23 11:34:28', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36', 1),
('52676b19-54fa-4490-a651-e9a4bb1193cb', '2026-01-12 08:43:05', '2026-01-12 08:43:05', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 1),
('5b09144f-99e4-4076-979c-c0f5176447bc', '2026-01-16 16:33:12', '2026-01-16 16:33:12', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 1),
('5d666c95-e75a-4c76-a70a-f31bfad72287', '2026-01-12 13:04:38', '2026-01-12 13:04:38', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15', 1),
('5d967eac-3310-491c-9217-a703b52f81a5', '2026-01-12 21:46:13', '2026-01-12 21:46:13', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 1),
('5dd2cc3a-89aa-47a9-bcee-5d7b632efd3b', '2026-01-11 22:13:34', '2026-01-11 22:13:34', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15', 1),
('6aa1e87f-576f-48d8-9e6a-850bdda67724', '2026-01-16 10:34:22', '2026-01-16 10:34:22', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 1),
('7251489f-35e5-4ac2-b036-0a3c1eea4f22', '2026-01-15 16:22:12', '2026-01-15 16:22:12', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 1),
('80dd23ba-6bf3-435b-9312-e6aa022a3a5b', '2026-01-16 15:47:39', '2026-01-16 15:47:39', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 1),
('855f8d9b-0df7-4ab3-9c78-5d74863a4b44', '2026-01-16 10:27:36', '2026-01-16 10:27:36', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 1),
('876601f3-7e9d-4402-a5d8-fbea985cf72a', '2026-01-15 09:55:15', '2026-01-15 09:55:15', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 1),
('87ad7dda-aa75-4ee8-b379-2deeae352d2e', '2026-01-11 20:54:37', '2026-01-11 20:54:37', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 1),
('96c14d33-0e92-4601-91f7-d05a4e74fa38', '2026-01-12 08:48:50', '2026-01-12 08:48:50', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 1),
('9a5140c8-0331-468f-9813-80edb1280633', '2026-01-11 21:08:12', '2026-01-12 11:19:37', '::1', NULL, NULL, 'PostmanRuntime/7.49.1', 3),
('9c353ea0-6892-4b76-b0f0-c65cc9228323', '2026-01-13 08:34:10', '2026-01-13 08:34:10', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 1),
('9db300cc-9393-40dc-95a3-c34b771cc417', '2026-01-16 10:29:40', '2026-01-16 10:29:40', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 1),
('9fedf8e3-2847-4ffd-9162-0b1e093498bf', '2026-01-12 10:29:57', '2026-01-12 10:29:57', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 1),
('a0238535-915a-44ad-b231-28ab5c21288e', '2026-01-14 13:28:19', '2026-01-14 13:28:19', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 1),
('a403a09b-d4eb-46fe-8157-617242cce813', '2026-01-15 16:09:55', '2026-01-15 16:09:55', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 1),
('a86e5e9e-3085-4171-8925-49679603577b', '2026-01-11 21:42:45', '2026-01-11 21:42:45', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 1),
('a8d551a0-cd7f-46ce-bdd4-8a474ad188a3', '2026-01-16 15:17:22', '2026-01-16 15:17:22', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 1),
('aaf7d151-d8ac-4d33-9bb1-d1ec8af9506c', '2026-01-12 13:20:18', '2026-01-12 13:20:18', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15', 1),
('c20e22c0-4ab5-42a0-a25a-ab7b81f4c543', '2026-01-20 15:00:22', '2026-01-20 15:00:22', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36', 1),
('c63c78d3-e4a0-418a-b7fa-bc3200a2d42f', '2026-01-21 16:07:06', '2026-01-21 16:07:06', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36', 1),
('cbc38535-0fde-4339-bdc9-e7c574eb1954', '2026-01-11 22:32:38', '2026-01-11 22:32:38', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15', 1),
('d3aaae9f-b4fb-45bf-8a1f-8a997277bbf0', '2026-01-12 08:24:59', '2026-01-12 08:24:59', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 1),
('d84be8c7-f668-4395-9093-56bdb85a2b73', '2026-01-21 15:59:40', '2026-01-21 15:59:40', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 1),
('e620dc65-e980-41c3-866d-df3fd7bbe6e3', '2026-01-17 06:44:43', '2026-01-17 06:44:43', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 1),
('e9a9afd9-9bcb-4d82-abb6-52f9f1219923', '2026-01-23 11:28:13', '2026-01-23 11:28:13', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36', 1),
('ee5f2874-bdcb-4d26-a6b5-bbc1d3acd1e6', '2026-01-21 15:59:42', '2026-01-21 15:59:42', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36', 1),
('f2100bd7-8deb-4458-9627-4da893f7ace8', '2026-01-13 13:25:10', '2026-01-13 13:25:10', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 1),
('f9c5d2f2-7d84-431a-929f-a74adef8fb1b', '2026-01-22 13:30:53', '2026-01-22 13:30:53', '::1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36', 1);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `announcement`
--
ALTER TABLE `announcement`
  ADD PRIMARY KEY (`idannouncement`);

--
-- Indexes for table `announcements`
--
ALTER TABLE `announcements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ann_status_created` (`status`,`created_at`);

--
-- Indexes for table `announcement_attachments`
--
ALTER TABLE `announcement_attachments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_attach_announcement` (`announcement_id`);

--
-- Indexes for table `announcement_tags`
--
ALTER TABLE `announcement_tags`
  ADD PRIMARY KEY (`announcement_id`,`tag`),
  ADD KEY `idx_tag` (`tag`);

--
-- Indexes for table `announcement_targets`
--
ALTER TABLE `announcement_targets`
  ADD PRIMARY KEY (`announcement_id`,`member_id`),
  ADD KEY `idx_target_member` (`member_id`);

--
-- Indexes for table `boarddirector`
--
ALTER TABLE `boarddirector`
  ADD PRIMARY KEY (`idboarddirector`);

--
-- Indexes for table `chat_conversations`
--
ALTER TABLE `chat_conversations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_chat_conversations_bankcode` (`bankcode`),
  ADD KEY `idx_chat_conversations_updated_at` (`updated_at`);

--
-- Indexes for table `chat_messages`
--
ALTER TABLE `chat_messages`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_chat_messages_conv_clientmsg` (`conversation_id`,`client_msg_id`),
  ADD KEY `idx_chat_messages_conversation_id_id` (`conversation_id`,`id`),
  ADD KEY `idx_chat_messages_created_at` (`created_at`);

--
-- Indexes for table `documents`
--
ALTER TABLE `documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_type` (`type`),
  ADD KEY `idx_updated` (`updated_at`),
  ADD KEY `idx_owner` (`owner`),
  ADD KEY `idx_deleted` (`is_deleted`);
ALTER TABLE `documents` ADD FULLTEXT KEY `ft_docs_search` (`name`,`description`);

--
-- Indexes for table `document_tags`
--
ALTER TABLE `document_tags`
  ADD PRIMARY KEY (`doc_id`,`tag`),
  ADD KEY `idx_tag` (`tag`);

--
-- Indexes for table `emp_lapnet`
--
ALTER TABLE `emp_lapnet`
  ADD PRIMARY KEY (`emp_id`);

--
-- Indexes for table `form_submissions`
--
ALTER TABLE `form_submissions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_template_id` (`template_id`),
  ADD KEY `idx_submitted_at` (`submitted_at`),
  ADD KEY `idx_email` (`email`);

--
-- Indexes for table `form_submission_files`
--
ALTER TABLE `form_submission_files`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_submission_id` (`submission_id`),
  ADD KEY `idx_question_id` (`question_id`);

--
-- Indexes for table `form_templates`
--
ALTER TABLE `form_templates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_source_form_id` (`source_form_id`),
  ADD UNIQUE KEY `uq_form_templates_source_form_id` (`source_form_id`);

--
-- Indexes for table `form_template_assets`
--
ALTER TABLE `form_template_assets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_tpl_asset` (`source_form_id`,`question_id`,`image_id`),
  ADD KEY `idx_tpl` (`template_id`),
  ADD KEY `idx_source` (`source_form_id`);

--
-- Indexes for table `jobs_list`
--
ALTER TABLE `jobs_list`
  ADD PRIMARY KEY (`job_id`);

--
-- Indexes for table `members`
--
ALTER TABLE `members`
  ADD PRIMARY KEY (`idmember`);

--
-- Indexes for table `news`
--
ALTER TABLE `news`
  ADD PRIMARY KEY (`idnews`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`idnotification`),
  ADD KEY `idx_unread_time` (`is_read`,`time`),
  ADD KEY `idx_entity_ref` (`entity`,`ref_id`),
  ADD KEY `idx_time` (`time`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_users_username` (`username`),
  ADD KEY `idx_users_bankcode` (`bankcode`);

--
-- Indexes for table `visitors_events`
--
ALTER TABLE `visitors_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_occurred_at` (`occurred_at`),
  ADD KEY `idx_session_time` (`session_id`,`occurred_at`),
  ADD KEY `idx_country_time` (`country_code`,`occurred_at`),
  ADD KEY `idx_path_time` (`path`,`occurred_at`);

--
-- Indexes for table `visitors_sessions`
--
ALTER TABLE `visitors_sessions`
  ADD PRIMARY KEY (`session_id`),
  ADD KEY `idx_last_seen` (`last_seen_at`),
  ADD KEY `idx_country_last_seen` (`country_code`,`last_seen_at`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `announcement`
--
ALTER TABLE `announcement`
  MODIFY `idannouncement` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `announcements`
--
ALTER TABLE `announcements`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `announcement_attachments`
--
ALTER TABLE `announcement_attachments`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `boarddirector`
--
ALTER TABLE `boarddirector`
  MODIFY `idboarddirector` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT for table `chat_conversations`
--
ALTER TABLE `chat_conversations`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=61;

--
-- AUTO_INCREMENT for table `chat_messages`
--
ALTER TABLE `chat_messages`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `documents`
--
ALTER TABLE `documents`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=35;

--
-- AUTO_INCREMENT for table `emp_lapnet`
--
ALTER TABLE `emp_lapnet`
  MODIFY `emp_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=38;

--
-- AUTO_INCREMENT for table `form_submissions`
--
ALTER TABLE `form_submissions`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `form_submission_files`
--
ALTER TABLE `form_submission_files`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `form_templates`
--
ALTER TABLE `form_templates`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=269;

--
-- AUTO_INCREMENT for table `form_template_assets`
--
ALTER TABLE `form_template_assets`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `jobs_list`
--
ALTER TABLE `jobs_list`
  MODIFY `job_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `members`
--
ALTER TABLE `members`
  MODIFY `idmember` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=42;

--
-- AUTO_INCREMENT for table `news`
--
ALTER TABLE `news`
  MODIFY `idnews` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `idnotification` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `visitors_events`
--
ALTER TABLE `visitors_events`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=51;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `announcement_attachments`
--
ALTER TABLE `announcement_attachments`
  ADD CONSTRAINT `fk_announcement_attachments_announcement` FOREIGN KEY (`announcement_id`) REFERENCES `announcements` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `announcement_tags`
--
ALTER TABLE `announcement_tags`
  ADD CONSTRAINT `fk_announcement_tags_announcement` FOREIGN KEY (`announcement_id`) REFERENCES `announcements` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `announcement_targets`
--
ALTER TABLE `announcement_targets`
  ADD CONSTRAINT `fk_announcement_targets_announcement` FOREIGN KEY (`announcement_id`) REFERENCES `announcements` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `chat_messages`
--
ALTER TABLE `chat_messages`
  ADD CONSTRAINT `fk_chat_messages_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `chat_conversations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `document_tags`
--
ALTER TABLE `document_tags`
  ADD CONSTRAINT `fk_document_tags_doc` FOREIGN KEY (`doc_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `form_submission_files`
--
ALTER TABLE `form_submission_files`
  ADD CONSTRAINT `fk_form_submission_files_submission` FOREIGN KEY (`submission_id`) REFERENCES `form_submissions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `form_template_assets`
--
ALTER TABLE `form_template_assets`
  ADD CONSTRAINT `fk_tpl_assets_template` FOREIGN KEY (`template_id`) REFERENCES `form_templates` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
