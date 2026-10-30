# Solução de Problemas no Windows

Caso encontre dificuldades ao configurar a aplicação no Windows (PowerShell / CMD), siga as orientações abaixo:

1. **Node.js ou npm não reconhecidos:**
   Caso os comandos `node` ou `npm` não sejam identificados no terminal, instale a versão Node.js LTS utilizando o gerenciador de pacotes do Windows:
   ```powershell
   winget install OpenJS.NodeJS.LTS
   ```
   *(Feche e reabra o terminal após a conclusão da instalação).*

2. **Erro de Execução de Scripts no PowerShell (`PSSecurityException`):**
   Se o PowerShell bloquear a execução de scripts com erros de política de segurança (`ps1 cannot be loaded`), altere a política de execução para o usuário atual executando:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

3. **Encoding do `.env` (UTF-16LE):** crie o arquivo com `copy backend\.env.example backend\.env` e edite em um editor que salve em **UTF-8**. Comandos como `echo ... > .env` no PowerShell geram UTF-16LE e quebram a leitura da chave.
