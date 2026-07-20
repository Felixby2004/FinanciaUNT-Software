
import { PLANS, PLAN_FEATURES } from '../constants/plans';

export function getUserPlan(user) {
  if (!user) return PLANS.BASIC;
  if (user.rol === 'admin') return PLANS.ADMIN;
  
  // Por defecto si no hay plan asignado, es básico
  const planName = user.plan_suscripcion || user.plan || PLANS.BASIC;
  return planName.toLowerCase();
}

export function getPlanFeatures(user) {
  const plan = getUserPlan(user);
  return PLAN_FEATURES[plan] || PLAN_FEATURES[PLANS.BASIC];
}

export function hasFeature(user, feature) {
  const features = getPlanFeatures(user);
  // Verifica si la característica existe en el plan
  return !!features[feature];
}

export function canUpgrade(user) {
  const features = getPlanFeatures(user);
  return features.canUpgrade;
}

export function canDowngrade(user) {
  const features = getPlanFeatures(user);
  return features.canDowngrade;
}
