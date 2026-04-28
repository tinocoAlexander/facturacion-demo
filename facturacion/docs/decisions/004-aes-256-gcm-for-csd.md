# AES-256-GCM para cifrado de certificados CSD

## Decisión
AES-256-GCM provee cifrado autenticado — detecta manipulación del ciphertext.
IV de 12 bytes (96 bits) según NIST SP 800-38D.
Master key de 32 bytes (256 bits) en CSD_ENCRYPTION_KEY.

## Consecuencias
Si CSD_ENCRYPTION_KEY cambia, todos los CSDs son indescriptables.
La misma key debe usarse en todos los ambientes que compartan la DB.
Un backup de la DB sin la key es inútil (feature, no bug).
