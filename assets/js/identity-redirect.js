// Los correos de Identity pueden volver a la raíz del dominio.
if (/^#(?:invite_token|recovery_token|confirmation_token|email_change_token|access_token)=/.test(location.hash)) {
  location.replace('/admin/' + location.hash);
}
