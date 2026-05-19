# 🆔 Guía de Ayuda — AiCoreMed Dashboard

Bienvenido a la guía de ayuda del dashboard de AiCoreMed. Acá encontrás tutoriales paso a paso para las tareas más comunes.

---

## 📑 Contenido

1. [Iniciar sesión](#1-iniciar-sesión)
2. [Recuperar tu contraseña](#2-recuperar-tu-contraseña)
3. [Cambiar tu contraseña](#3-cambiar-tu-contraseña)
4. [Planes de suscripción](#4-planes-de-suscripción)
5. [Configurar el perfil del consultorio](#5-configurar-el-perfil-del-consultorio)

---

## 1. Iniciar sesión

1. Andá a **med.aicorebots.com** (o la URL de tu instancia)
2. Hacé clic en **Iniciar sesión**
3. Ingresá tu **email** y **contraseña**
4. Si tenés **2FA activado**, ingresá el código de 6 dígitos de tu app autenticadora
5. Hacé clic en **Ingresar**

> 💡 Podés marcar **"Recordar contraseña"** para que el navegador guarde tus datos.

### Usuarios de prueba (desarrollo)

| Email | Contraseña | Plan |
|-------|-----------|------|
| admin@consultorio.com | admin123 | Enterprise |
| medico@consultorio.com | admin123 | Professional |
| starter@consultorio.com | starter123 | Starter |
| professional@consultorio.com | pro123 | Professional |
| premium@consultorio.com | premium123 | Premium |

---

## 2. Recuperar tu contraseña

**¿Olvidaste tu contraseña?** No hay problema, seguí estos pasos:

1. En la pantalla de inicio de sesión, hacé clic en **"Olvidé mi contraseña"**
2. Ingresá el **email** de tu cuenta
3. Hacé clic en **"Enviar enlace de recuperación"**
4. Revisá tu email (o la respuesta de la API en modo desarrollo)
5. Hacé clic en el enlace que recibiste
6. Ingresá tu **nueva contraseña** (mínimo 8 caracteres)
7. Confirmala y hacé clic en **"Restablecer contraseña"**
8. Ya podés iniciar sesión con tu nueva contraseña

> ⚠️ El enlace de recuperación expira después de **1 hora**.
> Si no recibís el email, revisá la carpeta de spam o solicitá un nuevo enlace.

---

## 3. Cambiar tu contraseña

Para cambiar tu contraseña desde el dashboard:

1. Iniciá sesión en tu cuenta
2. Andá a **Configuración** → **Perfil**
3. Buscá la sección **"Cambiar contraseña"**
4. Ingresá tu **contraseña actual**
5. Ingresá la **nueva contraseña** (mínimo 8 caracteres)
6. Repetí la nueva contraseña para confirmar
7. Hacé clic en **"Cambiar contraseña"**

> ✅ Verás un mensaje verde de confirmación cuando se haya actualizado correctamente.

---

## 4. Planes de suscripción

AiCoreMed ofrece 5 planes con diferentes características:

| Plan | Precio (USD/mes) | Precio (CLP/mes) | Ideal para |
|------|-----------------|-------------------|-----------|
| **Free** | $0 | $0 | Probar el sistema |
| **Starter** | $49 | ~$45.000 | Consultorios pequeños |
| **Professional** | $99 | ~$94.000 | Consultorios en crecimiento |
| **Premium** | $199 | ~$189.000 | Clínicas con múltiples médicos |
| **Enterprise** | $499 | ~$474.000 | Grandes centros médicos |

### ¿Qué funciones tengo según mi plan?

En el menú lateral, las funciones que **no están disponibles** en tu plan se ven con un candado 🔒 y el nombre del plan requerido. Hacé clic en ellas para ver las opciones de suscripción.

### ¿Cómo cambio de plan?

1. Andá a **Configuración** → **Suscripción**
2. Elegí el plan que querés
3. Hacé clic en **"Suscribirse"**
4. Seguí el proceso de pago con MercadoPago

---

## 5. Configurar el perfil del consultorio

1. Andá a **Configuración** → **Perfil**
2. Completá los datos de tu consultorio:
   - **Nombre**: nombre del consultorio o médico
   - **Eslogan**: frase corta que identifica al consultorio
   - **Descripción**: texto descriptivo
   - **Dirección y contacto**: teléfono, WhatsApp, email, sitio web
   - **Redes sociales**: Instagram, Facebook
   - **Colores**: personalizá el color primario y secundario
3. Hacé clic en **"Guardar cambios"**

> 💡 Los cambios se ven reflejados al instante en el sidebar y header.

---

## ❓ Preguntas frecuentes

**¿Puedo usar el mismo email para varias cuentas?**
No, cada email debe ser único.

**¿Qué hago si no recibo el email de recuperación?**
Verificá que el email ingresado sea correcto y revisá la carpeta de spam. Si estás en modo desarrollo, el enlace aparece en la respuesta de la API.

**¿Puedo desactivar el 2FA?**
Sí, desde Configuración → Perfil → sección de 2FA.

**¿Cómo cierro sesión?**
Hacé clic en tu avatar en el header o en el botón "Cerrar sesión" al pie del menú lateral.

---

> 📚 **Más documentación técnica:**
> - [Arquitectura del sistema](../docs/architecture.md)
> - [Esquema de base de datos](../docs/database.md)
> - [Workflows de n8n](../docs/workflows.md)
