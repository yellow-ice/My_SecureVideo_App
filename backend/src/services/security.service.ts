import { prisma } from '../config/prisma';

export const calculateRiskScore = async (): Promise<number> => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const attacks = await prisma.attackLog.findMany({ where: { created_at: { gte: since } } });
  const countWeight = Math.min(attacks.length * 2, 40);
  const highCount = attacks.filter((a) => a.severity === 'high').length;
  const highWeight = Math.min(highCount * 5, 35);
  const blockedCount = attacks.filter((a) => a.status === 'blocked').length;
  const successRate = attacks.length === 0 ? 0 : (attacks.length - blockedCount) / attacks.length;
  const successWeight = Math.round(successRate * 25);
  return Math.min(100, countWeight + highWeight + successWeight);
};
