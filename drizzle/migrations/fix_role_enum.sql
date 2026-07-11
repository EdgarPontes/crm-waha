-- Migração para corrigir o tipo ENUM da coluna 'role' na tabela 'users'
-- Muda de ENUM('user', 'admin') para ENUM('Administrador', 'Supervisor', 'Atendente')

ALTER TABLE `users` MODIFY COLUMN `role` ENUM('Administrador', 'Supervisor', 'Atendente') NOT NULL DEFAULT 'Atendente';
