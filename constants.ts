import { UserRole } from "./types";

export const APP_VERSION = "1.0.0 (Web Implementation)";
export const LOCAL_STORAGE_KEY = "canteen_db_v1";

// Hardcoded users as per "System_Users" requirement logic
// In a real C# WinForms app, this would be a SQL query against hashed passwords.
export const SYSTEM_USERS = [
  { username: 'admin', password: 'password', role: UserRole.ADMIN },
  { username: 'tech', password: 'password', role: UserRole.TECH },
];

export const MOCK_CSV_DATA = `ID,Name,Department,Limit
101,John Doe,Engineering,500
102,Jane Smith,HR,300
103,Bob Johnson,Logistics,450
104,Alice Williams,Sales,600
105,Charlie Brown,Engineering,500`;