/**
 * Configuração de Banco de Dados Customizado
 *
 * Este arquivo permite usar um banco de dados customizado (MySQL, PostgreSQL, TiDB, MariaDB)
 * em vez do banco de dados padrão do Manus.
 *
 * Bancos de Dados Suportados:
 * - MySQL 5.7+
 * - MariaDB 10.3+
 * - TiDB
 * - PostgreSQL 12+
 *
 * Configuração via variáveis de ambiente:
 *
 * 1. CUSTOM_DB_TYPE: Tipo de banco de dados (mysql, postgres)
 *    - Padrão: mysql
 *
 * 2. CUSTOM_DB_URL: String de conexão completa
 *    - MySQL: mysql://usuario:senha@host:porta/banco
 *    - PostgreSQL: postgresql://usuario:senha@host:porta/banco
 *
 * 3. Componentes individuais (alternativa):
 *    - CUSTOM_DB_HOST: Host do banco de dados
 *    - CUSTOM_DB_PORT: Porta do banco de dados
 *    - CUSTOM_DB_USER: Usuário do banco de dados
 *    - CUSTOM_DB_PASSWORD: Senha do banco de dados
 *    - CUSTOM_DB_NAME: Nome do banco de dados
 *
 * Exemplos:
 *
 * MySQL Local:
 *   CUSTOM_DB_TYPE=mysql
 *   CUSTOM_DB_URL=mysql://root:password@localhost:3306/crm_waha
 *
 * PostgreSQL Local:
 *   CUSTOM_DB_TYPE=postgres
 *   CUSTOM_DB_URL=postgresql://postgres:password@localhost:5432/crm_waha
 *
 * TiDB Cloud:
 *   CUSTOM_DB_TYPE=mysql
 *   CUSTOM_DB_URL=mysql://usuario:senha@tidb-host.tidbcloud.com:4000/crm_waha
 *
 * PostgreSQL (AWS RDS):
 *   CUSTOM_DB_TYPE=postgres
 *   CUSTOM_DB_URL=postgresql://admin:password@crm-db.xxxxx.rds.amazonaws.com:5432/crm_waha
 *
 * PostgreSQL (Google Cloud SQL):
 *   CUSTOM_DB_TYPE=postgres
 *   CUSTOM_DB_URL=postgresql://postgres:password@35.184.123.45:5432/crm_waha
 */

export type DatabaseType = "mysql" | "postgres";

export function getDatabaseType(): DatabaseType {
  const type = (process.env.CUSTOM_DB_TYPE || "mysql").toLowerCase();

  if (type === "postgres" || type === "postgresql") {
    return "postgres";
  }

  return "mysql";
}

export function buildCustomDatabaseUrl(): string | null {
  const dbType = getDatabaseType();

  // Prioridade 1: DATABASE_URL (formato padrão)
  if (process.env.DATABASE_URL) {
    console.log(`[Database] Usando DATABASE_URL (${dbType})`);
    return process.env.DATABASE_URL;
  }

  // Prioridade 2: DB_URL (compatibilidade com .env existente)
  if (process.env.DB_URL) {
    console.log(`[Database] Usando DB_URL (${dbType})`);
    return process.env.DB_URL;
  }

  // Prioridade 3: CUSTOM_DB_URL (configuração customizada anterior)
  if (process.env.CUSTOM_DB_URL) {
    console.log(`[Database] Usando CUSTOM_DB_URL (${dbType})`);
    return process.env.CUSTOM_DB_URL;
  }

  // Caso contrário, construa a URL a partir dos componentes individuais
  const host = process.env.CUSTOM_DB_HOST;
  const port = process.env.CUSTOM_DB_PORT;
  const user = process.env.CUSTOM_DB_USER;
  const password = process.env.CUSTOM_DB_PASSWORD;
  const database = process.env.CUSTOM_DB_NAME;

  // Se todos os componentes estiverem disponíveis, construa a URL
  if (host && user && password && database) {
    const defaultPort = dbType === "postgres" ? "5432" : "3306";
    const finalPort = port || defaultPort;
    const protocol = dbType === "postgres" ? "postgresql" : "mysql";

    const url = `${protocol}://${user}:${password}@${host}:${finalPort}/${database}`;
    console.log(
      `[Database] Usando banco de dados customizado (${dbType}): ${host}:${finalPort}/${database}`
    );
    return url;
  }

  // Se nenhuma configuração customizada foi fornecida, retorne null
  if (host || port || user || password || database) {
    console.warn(
      "[Database] Configuração de banco de dados customizado incompleta"
    );
    console.warn(
      "[Database] Certifique-se de que todas as variáveis estão configuradas"
    );
  }

  return null;
}

export function isDatabaseConfigured(): boolean {
  return !!(
    process.env.CUSTOM_DB_URL ||
    (process.env.CUSTOM_DB_HOST &&
      process.env.CUSTOM_DB_USER &&
      process.env.CUSTOM_DB_PASSWORD &&
      process.env.CUSTOM_DB_NAME)
  );
}

export function getDatabaseConnectionInfo(): {
  type: "custom" | "manus" | "none";
  dbType?: DatabaseType;
  url?: string;
  host?: string;
  port?: string;
  database?: string;
} {
  if (process.env.CUSTOM_DB_URL) {
    return {
      type: "custom",
      dbType: getDatabaseType(),
      url: process.env.CUSTOM_DB_URL,
    };
  }

  if (
    process.env.CUSTOM_DB_HOST &&
    process.env.CUSTOM_DB_USER &&
    process.env.CUSTOM_DB_PASSWORD &&
    process.env.CUSTOM_DB_NAME
  ) {
    const dbType = getDatabaseType();
    const defaultPort = dbType === "postgres" ? "5432" : "3306";

    return {
      type: "custom",
      dbType,
      host: process.env.CUSTOM_DB_HOST,
      port: process.env.CUSTOM_DB_PORT || defaultPort,
      database: process.env.CUSTOM_DB_NAME,
    };
  }

  if (process.env.DATABASE_URL) {
    return {
      type: "manus",
      dbType: "mysql",
      url: process.env.DATABASE_URL,
    };
  }

  return {
    type: "none",
  };
}

/**
 * Obtém o driver de banco de dados apropriado
 * Retorna o módulo do driver que deve ser usado
 */
export function getDatabaseDriver(): string {
  const dbType = getDatabaseType();

  if (dbType === "postgres") {
    return "pg";
  }

  return "mysql2";
}

/**
 * Obtém a configuração do Drizzle para o banco de dados
 */
export function getDrizzleDialect(): "mysql" | "postgresql" {
  const dbType = getDatabaseType();

  if (dbType === "postgres") {
    return "postgresql";
  }

  return "mysql";
}
