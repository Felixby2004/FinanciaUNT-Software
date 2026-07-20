// src/utils/validations.js

export const validateCardNumber = (value) => {
  // Eliminar espacios y caracteres no numéricos
  const clean = value.replace(/\D/g, '');
  if (clean.length === 0) return { valid: false, message: 'El número de tarjeta es obligatorio' };
  if (clean.length < 13 || clean.length > 16) {
    return { valid: false, message: 'El número de tarjeta debe tener entre 13 y 16 dígitos' };
  }
  // Algoritmo de Luhn (opcional pero recomendado)
  let sum = 0;
  let double = false;
  for (let i = clean.length - 1; i >= 0; i--) {
    let digit = parseInt(clean[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  if (sum % 10 !== 0) {
    return { valid: false, message: 'Número de tarjeta inválido' };
  }
  return { valid: true, message: '' };
};

export const formatCardNumber = (value) => {
  const clean = value.replace(/\D/g, '');
  const groups = clean.match(/.{1,4}/g) || [];
  return groups.join(' ').slice(0, 19);
};

export const validateExpiry = (value) => {
  // Eliminar caracteres no numéricos
  const clean = value.replace(/\D/g, '');
  if (clean.length === 0) return { valid: false, message: 'La fecha de expiración es obligatoria' };
  if (clean.length !== 4) return { valid: false, message: 'Formato MM/AA' };
  
  const month = parseInt(clean.substring(0, 2));
  const year = parseInt(clean.substring(2, 4));
  const currentYear = new Date().getFullYear() % 100;
  const currentMonth = new Date().getMonth() + 1;

  if (month < 1 || month > 12) {
    return { valid: false, message: 'Mes inválido (01-12)' };
  }
  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return { valid: false, message: 'La tarjeta ha expirado' };
  }
  return { valid: true, message: '' };
};

export const formatExpiry = (value) => {
  const clean = value.replace(/\D/g, '');
  if (clean.length >= 3) {
    return clean.substring(0, 2) + '/' + clean.substring(2, 4);
  }
  return clean;
};

export const validateCVV = (value) => {
  const clean = value.replace(/\D/g, '');
  if (clean.length === 0) return { valid: false, message: 'El CVV es obligatorio' };
  if (clean.length < 3 || clean.length > 4) {
    return { valid: false, message: 'El CVV debe tener 3 o 4 dígitos' };
  }
  return { valid: true, message: '' };
};

export const validateCardholderName = (value) => {
  if (!value.trim()) return { valid: false, message: 'El nombre del titular es obligatorio' };
  if (!/^[a-zA-ZáéíóúñÑ\s]+$/.test(value)) {
    return { valid: false, message: 'Solo letras y espacios' };
  }
  return { valid: true, message: '' };
};

// Validación completa del formulario de pago
export const validatePaymentForm = (details) => {
  const cardValidation = validateCardNumber(details.cardNumber);
  const expiryValidation = validateExpiry(details.expiry);
  const cvvValidation = validateCVV(details.cvv);
  const nameValidation = validateCardholderName(details.cardholderName);

  const errors = {};
  if (!cardValidation.valid) errors.cardNumber = cardValidation.message;
  if (!expiryValidation.valid) errors.expiry = expiryValidation.message;
  if (!cvvValidation.valid) errors.cvv = cvvValidation.message;
  if (!nameValidation.valid) errors.cardholderName = nameValidation.message;

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};