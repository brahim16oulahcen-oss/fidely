/**
 * Génération du dataset de démonstration — déterministe (graine fixe) et cohérent :
 * chaque solde de carte, statistique et KPI découle des transactions simulées
 * par le même moteur de fidélité que l'application.
 */
import { randomBytes } from "crypto";
import { computeEarn, computeTier, describeRules } from "@/features/loyalty/engine";
import { hashPassword } from "@/lib/security/password";
import { newScanCode, newSecretToken } from "@/lib/utils/ids";
import { createRng, type Rng } from "@/lib/utils/random";
import { DAY_MS } from "@/lib/utils/dates";
import { PLANS } from "@/config/plans";
import type {
  Automation,
  AutomationTrigger,
  Campaign,
  Customer,
  DemoDatabase,
  Invoice,
  LoyaltyCard,
  Merchant,
  MessageLog,
  Program,
  Reward,
  RewardIssuance,
  SegmentId,
  Transaction,
  User,
} from "@/types/domain";
import {
  DEMO_ADMIN,
  DEMO_CUSTOMER_EMAIL,
  DEMO_PASSWORD,
  FIRST_NAMES,
  LAST_NAMES,
  MERCHANT_FIXTURES,
} from "./fixtures";
import { segmentOf } from "@/features/customers/segments";

export const SEED_VERSION = 3;
const SEED = 20261031;

let counter = 0;
const sid = (p: string) => `${p}_${(++counter).toString(36).padStart(6, "0")}${randomBytes(3).toString("hex")}`;
const iso = (t: number) => new Date(t).toISOString();

function visitTime(rng: Rng, dayStart: number, hours: [number, number]) {
  const d = new Date(dayStart);
  d.setHours(rng.int(hours[0], hours[1] - 1), rng.int(0, 59), rng.int(0, 59), 0);
  return d.getTime();
}

function normalizeEmail(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z.]/g, "");
}

function fictionalPhone(rng: Rng) {
  // Plage ARCEP réservée à la fiction : 06 39 98 00 00 — 06 39 98 99 99
  return `06 39 98 ${String(rng.int(0, 99)).padStart(2, "0")} ${String(rng.int(0, 99)).padStart(2, "0")}`;
}

export function buildSeed(nowDate = new Date()): DemoDatabase {
  counter = 0;
  const rng = createRng(SEED);
  const now = nowDate.getTime();
  const pwd = hashPassword(DEMO_PASSWORD);

  const db: DemoDatabase = {
    version: SEED_VERSION,
    seededAt: iso(now),
    merchants: [],
    stores: [],
    users: [],
    programs: [],
    rewards: [],
    customers: [],
    cards: [],
    transactions: [],
    issuances: [],
    campaigns: [],
    automations: [],
    messageLogs: [],
    subscriptions: [],
    invoices: [],
    auditLogs: [],
    consentLogs: [],
    tickets: [],
  };

  const admin: User = {
    id: "usr_admin",
    email: DEMO_ADMIN.email,
    name: DEMO_ADMIN.name,
    passwordHash: pwd,
    isPlatformAdmin: true,
    memberships: [],
    emailVerified: true,
    createdAt: iso(now - 400 * DAY_MS),
  };
  db.users.push(admin);

  const usedEmails = new Set<string>();
  const userByEmail = new Map<string, User>();
  let invoiceSeq = 1;

  for (const fx of MERCHANT_FIXTURES) {
    const merchantId = `mer_${fx.key}`;
    const created = now - fx.monthsActive * 30 * DAY_MS - 5 * DAY_MS;

    // ── Utilisateurs ────────────────────────────────────────────
    const ensureUser = (name: string, email: string, role: "owner" | "manager" | "staff") => {
      let u = userByEmail.get(email);
      if (!u) {
        u = {
          id: `usr_${email.split("@")[0]}`,
          email,
          name,
          passwordHash: pwd,
          isPlatformAdmin: false,
          memberships: [],
          emailVerified: true,
          createdAt: iso(created),
        };
        userByEmail.set(email, u);
        db.users.push(u);
      }
      u.memberships.push({ merchantId, role });
      return u;
    };
    const owner = ensureUser(fx.owner.name, fx.owner.email, "owner");
    const staffUsers = (fx.staff ?? []).map((s) => ensureUser(s.name, s.email, s.role));
    const actors = [owner, ...staffUsers];

    // ── Commerce, établissements, programme ─────────────────────
    const stores = fx.stores.map((s, i) => ({
      id: `sto_${fx.key}_${i + 1}`,
      merchantId,
      name: s.name,
      address: s.address,
      createdAt: iso(created + i * 40 * DAY_MS),
    }));
    db.stores.push(...stores);

    const programId = `prg_${fx.key}`;
    const ruleVersion = fx.previousRules ? 2 : 1;
    const program: Program = {
      id: programId,
      merchantId,
      name: fx.programName,
      type: fx.rules.type,
      status: "active",
      rules: fx.rules,
      ruleVersion,
      card: {
        title: fx.programName,
        background: fx.colors.primary,
        text: fx.colors.text,
        accent: fx.colors.accent,
        showLogo: true,
        rewardText: fx.rules.type === "stamps" ? fx.rules.rewardName : fx.rewards[0]?.name ?? "",
        terms: "Programme nominatif, sans obligation d'achat. Récompenses non échangeables contre de l'argent.",
      },
      createdAt: iso(created + DAY_MS),
      updatedAt: iso(fx.rulesChangedDaysAgo ? now - fx.rulesChangedDaysAgo * DAY_MS : created + DAY_MS),
    };
    db.programs.push(program);

    const merchant: Merchant = {
      id: merchantId,
      slug: fx.slug,
      name: fx.name,
      category: fx.category,
      description: fx.description,
      address: fx.address,
      city: "Rouen",
      postalCode: fx.postalCode,
      phone: `02 35 ${String(rng.int(10, 99))} ${String(rng.int(10, 99))} ${String(rng.int(10, 99))}`,
      email: `contact@${fx.slug}.example`,
      logo: { icon: fx.icon },
      colors: fx.colors,
      planId: fx.planId,
      status: fx.status,
      suspendedReason: fx.suspendedReason,
      primaryProgramId: programId,
      onboardingCompleted: true,
      settings: { minSecondsBetweenVisits: 60, maxAmountCents: 100000, retentionMonths: 36, attributionRate: 0.2 },
      createdAt: iso(created),
      isDemoSeed: true,
    };
    db.merchants.push(merchant);

    const rewards: Reward[] = fx.rewards.map((r, i) => ({
      id: `rwd_${fx.key}_${i + 1}`,
      merchantId,
      programId,
      name: r.name,
      description: r.description,
      cost: r.cost,
      validityDays: r.validityDays,
      quantity: r.quantity,
      issuedCount: 0,
      active: true,
      autoUnlock: r.autoUnlock,
      createdAt: iso(created + DAY_MS),
    }));
    db.rewards.push(...rewards);
    const mainReward = rewards.find((r, i) => fx.rewards[i].main);
    const giftReward = rewards.find((r) => r.cost === 0);
    const pointRewards = rewards.filter((r) => r.cost > 0).sort((a, b) => a.cost - b.cost);

    // ── Clients et historique ──────────────────────────────────
    const programStart = created + 2 * DAY_MS;
    const changeAt = fx.rulesChangedDaysAgo ? now - fx.rulesChangedDaysAgo * DAY_MS : 0;
    const churnCutoff = fx.status === "cancelled" ? now - 30 * DAY_MS : fx.status === "suspended" ? now - 20 * DAY_MS : now;

    for (let i = 0; i < fx.customers; i++) {
      const isDemoCustomer = fx.key === "cafe" && i === 0;
      const first = isDemoCustomer ? "Léa" : rng.pick(FIRST_NAMES);
      const last = isDemoCustomer ? "Martin" : rng.pick(LAST_NAMES);
      let email = isDemoCustomer ? DEMO_CUSTOMER_EMAIL : `${normalizeEmail(first)}.${normalizeEmail(last)}@example.com`;
      let n = 2;
      while (usedEmails.has(`${merchantId}:${email}`)) email = `${normalizeEmail(first)}.${normalizeEmail(last)}${n++}@example.com`;
      usedEmails.add(`${merchantId}:${email}`);

      const signupAt = isDemoCustomer
        ? visitTime(rng, now - 74 * DAY_MS, fx.openHours)
        : visitTime(rng, programStart + (churnCutoff - programStart) * Math.pow(rng.next(), 0.8), fx.openHours);
      if (signupAt > now) continue;

      const consent = {
        email: isDemoCustomer ? true : rng.chance(0.62),
        sms: isDemoCustomer ? false : rng.chance(0.34),
        wallet: rng.chance(0.5),
        updatedAt: iso(signupAt),
      };
      const customer: Customer = {
        id: sid("cus"),
        merchantId,
        firstName: first,
        lastName: last,
        email,
        phone: fictionalPhone(rng),
        birthday: rng.chance(0.7)
          ? `${String(rng.int(1, 12)).padStart(2, "0")}-${String(rng.int(1, 28)).padStart(2, "0")}`
          : undefined,
        consent,
        createdAt: iso(signupAt),
        source: rng.chance(0.7) ? "qr" : rng.chance(0.6) ? "staff" : "web",
      };
      db.customers.push(customer);
      db.consentLogs.push(
        { id: sid("cns"), merchantId, customerId: customer.id, channel: "program", granted: true, source: "Inscription", createdAt: customer.createdAt },
        ...(["email", "sms", "wallet"] as const).map((ch) => ({
          id: sid("cns"),
          merchantId,
          customerId: customer.id,
          channel: ch,
          granted: consent[ch],
          source: "Formulaire d'inscription",
          createdAt: customer.createdAt,
        })),
      );

      const card: LoyaltyCard = {
        id: sid("crd"),
        merchantId,
        programId,
        customerId: customer.id,
        token: newSecretToken(),
        scanCode: newScanCode(),
        stamps: 0,
        points: 0,
        lifetimePoints: 0,
        cashbackCents: 0,
        tier: "bronze",
        visits: 0,
        totalSpentCents: 0,
        lastVisitAt: null,
        createdAt: customer.createdAt,
        status: "active",
      };
      db.cards.push(card);

      const pushTx = (t: number, partial: Partial<Transaction> & Pick<Transaction, "kind">, rv = ruleVersion, rs = describeRules(fx.rules)) => {
        const tx: Transaction = {
          id: sid("trx"),
          merchantId,
          storeId: stores.length > 1 && rng.chance(0.4) ? stores[1].id : stores[0].id,
          programId,
          cardId: card.id,
          customerId: customer.id,
          amountCents: null,
          stampsDelta: 0,
          pointsDelta: 0,
          cashbackDeltaCents: 0,
          ruleVersion: rv,
          ruleSummary: rs,
          actorUserId: rng.pick(actors).id,
          idempotencyKey: sid("idk"),
          createdAt: iso(t),
          ...partial,
        };
        db.transactions.push(tx);
        return tx;
      };

      if (fx.rules.type === "points" && fx.rules.welcomePoints > 0) {
        card.points += fx.rules.welcomePoints;
        card.lifetimePoints += fx.rules.welcomePoints;
        pushTx(signupAt - 1000, { kind: "welcome", pointsDelta: fx.rules.welcomePoints, ruleSummary: "Bonus de bienvenue" });
      }

      // Profil d'engagement
      const p = rng.next();
      const mult = p < 0.2 ? 0.6 : p < 0.55 ? 1 : p < 0.8 ? 2.2 : 1.3;
      const maxVisits = p >= 0.8 ? rng.int(1, 4) : Infinity;
      const attrition = 0.035;

      // Léa Martin : parcours fixe (17 passages → 1 récompense disponible + 7 tampons)
      const demoVisits = isDemoCustomer
        ? Array.from({ length: 17 }, (_, k) => visitTime(rng, signupAt + Math.round((k * 72) / 16) * DAY_MS, fx.openHours))
        : null;

      let t = signupAt;
      let visits = 0;
      while (t <= Math.min(now, churnCutoff)) {
        if (demoVisits) {
          if (visits >= demoVisits.length) break;
          t = Math.max(demoVisits[visits], t + 60_000);
          if (t > now) break;
        }
        const useOld = fx.previousRules && t < changeAt;
        const rules = useOld ? fx.previousRules! : fx.rules;
        const rv = useOld ? 1 : ruleVersion;
        const amount = Math.max(150, Math.round(rng.gaussian(fx.avgBasketCents, fx.basketSdCents) / 10) * 10);

        // Utilisation de récompenses existantes avant l'achat
        if (!isDemoCustomer) {
          const available = db.issuances.filter((x) => x.cardId === card.id && x.status === "available" && new Date(x.expiresAt).getTime() > t);
          for (const iss of available) {
            if (rng.chance(0.8)) {
              const rtx = pushTx(t - 30_000, { kind: "redeem", rewardId: iss.rewardId, issuanceId: iss.id, ruleSummary: "Récompense utilisée" }, rv, describeRules(rules));
              iss.status = "redeemed";
              iss.redeemedAt = rtx.createdAt;
              iss.redeemedBy = rtx.actorUserId ?? undefined;
              iss.redeemTransactionId = rtx.id;
            }
          }
          if ((rules.type === "points" || rules.type === "tiers") && pointRewards.length && rng.chance(0.45)) {
            const affordable = pointRewards.filter((r) => r.cost <= card.points && (r.quantity === null || r.issuedCount < r.quantity));
            const reward = affordable[affordable.length - 1];
            if (reward) {
              const rtx = pushTx(t - 30_000, { kind: "redeem", rewardId: reward.id, pointsDelta: -reward.cost, ruleSummary: `Échange de ${reward.cost} pts` }, rv, describeRules(rules));
              card.points -= reward.cost;
              reward.issuedCount++;
              const iss: RewardIssuance = {
                id: sid("iss"),
                merchantId,
                rewardId: reward.id,
                cardId: card.id,
                customerId: customer.id,
                status: "redeemed",
                unlockedAt: rtx.createdAt,
                expiresAt: iso(t + reward.validityDays * DAY_MS),
                redeemedAt: rtx.createdAt,
                redeemedBy: rtx.actorUserId ?? undefined,
                redeemTransactionId: rtx.id,
              };
              rtx.issuanceId = iss.id;
              db.issuances.push(iss);
            }
          }
          if (rules.type === "cashback" && card.cashbackCents >= 500 && rng.chance(0.45)) {
            const use = Math.min(card.cashbackCents, amount);
            pushTx(t - 30_000, { kind: "cashback_use", cashbackDeltaCents: -use, ruleSummary: "Crédit fidélité utilisé" }, rv, describeRules(rules));
            card.cashbackCents -= use;
          }
        }

        const res = computeEarn({ rules, status: "active" }, card, { amountCents: amount });
        pushTx(t, {
          kind: "earn",
          amountCents: amount,
          stampsDelta: res.stampsDelta,
          pointsDelta: res.pointsDelta,
          cashbackDeltaCents: res.cashbackDeltaCents,
          ruleSummary: res.summary,
        }, rv, res.summary);
        card.stamps = res.stampsAfter;
        card.points = res.pointsAfter;
        card.lifetimePoints = res.lifetimePointsAfter;
        card.cashbackCents = res.cashbackAfterCents;
        card.tier = res.tierAfter;
        card.visits++;
        card.totalSpentCents += amount;
        card.lastVisitAt = iso(t);
        for (let k = 0; k < res.stampRewardsUnlocked && mainReward; k++) {
          mainReward.issuedCount++;
          db.issuances.push({
            id: sid("iss"),
            merchantId,
            rewardId: mainReward.id,
            cardId: card.id,
            customerId: customer.id,
            status: "available",
            unlockedAt: iso(t),
            expiresAt: iso(t + mainReward.validityDays * DAY_MS),
          });
        }

        visits++;
        if (visits >= maxVisits || (!isDemoCustomer && rng.chance(attrition))) break;
        if (!demoVisits) {
          const gap = Math.max(0.6, -Math.log(1 - rng.next()) * fx.meanIntervalDays * mult);
          t = visitTime(rng, t + gap * DAY_MS, fx.openHours);
        }
      }

      // Cadeaux d'anniversaire passés (récompense à 0)
      if (giftReward && customer.birthday && rng.chance(0.25) && card.visits > 2) {
        const at = Math.min(now - DAY_MS, new Date(card.lastVisitAt!).getTime() - 3 * DAY_MS);
        const redeemed = rng.chance(0.7);
        giftReward.issuedCount++;
        const iss: RewardIssuance = {
          id: sid("iss"),
          merchantId,
          rewardId: giftReward.id,
          cardId: card.id,
          customerId: customer.id,
          status: redeemed ? "redeemed" : "available",
          unlockedAt: iso(at - 5 * DAY_MS),
          expiresAt: iso(at - 5 * DAY_MS + giftReward.validityDays * DAY_MS),
        };
        if (redeemed) {
          const rtx = pushTx(at, { kind: "redeem", rewardId: giftReward.id, issuanceId: iss.id, ruleSummary: "Cadeau anniversaire utilisé" });
          iss.redeemedAt = rtx.createdAt;
          iss.redeemedBy = rtx.actorUserId ?? undefined;
          iss.redeemTransactionId = rtx.id;
        }
        db.issuances.push(iss);
      }

      if (fx.rules.type === "tiers") card.tier = computeTier(card.lifetimePoints, fx.rules);
    }

    // ── Abonnement & factures ──────────────────────────────────
    const plan = PLANS[fx.planId];
    const subEnd = fx.status === "cancelled" ? now - 30 * DAY_MS : now;
    db.subscriptions.push({
      merchantId,
      planId: fx.planId,
      status: fx.status === "trial" ? "trialing" : fx.status === "cancelled" ? "cancelled" : fx.status === "suspended" ? "past_due" : "active",
      startedAt: iso(created),
      currentPeriodEnd: iso(fx.status === "trial" ? created + 30 * DAY_MS : now + 12 * DAY_MS),
      cancelledAt: fx.status === "cancelled" ? iso(subEnd) : undefined,
      provider: "demo",
    });
    if (fx.status !== "trial") {
      let periodStart = created;
      const invoices: Invoice[] = [];
      while (periodStart + 30 * DAY_MS <= subEnd + 30 * DAY_MS && periodStart < subEnd) {
        invoices.push({
          id: sid("inv"),
          merchantId,
          number: `DEMO-${new Date(periodStart).getFullYear()}-${String(invoiceSeq++).padStart(4, "0")}`,
          planId: fx.planId,
          amountCents: plan.priceCents,
          issuedAt: iso(periodStart),
          periodStart: iso(periodStart),
          periodEnd: iso(periodStart + 30 * DAY_MS),
          status: "paid",
        });
        periodStart += 30 * DAY_MS;
      }
      if (fx.status === "suspended") invoices.slice(-2).forEach((i) => (i.status = "open"));
      db.invoices.push(...invoices);
    }

    // ── Automatisations ────────────────────────────────────────
    const autoMessages: Record<AutomationTrigger, string> = {
      inactive_30: "Bonjour {prenom}, cela fait un moment ! Passez nous voir cette semaine, votre carte vous attend.",
      birthday: "Joyeux anniversaire {prenom} ! Un cadeau vous attend sur votre carte {commerce}.",
      reward_available: "Bonne nouvelle {prenom} : votre récompense est disponible chez {commerce}.",
      new_member: "Bienvenue {prenom} ! Votre carte {commerce} est prête. À très vite.",
      special_offer: "{prenom}, profitez de notre offre spéciale cette semaine chez {commerce}.",
    };
    const marketingEnabled = plan.features.automations && fx.detailed && fx.status === "active";
    (Object.keys(autoMessages) as AutomationTrigger[]).forEach((trigger) => {
      const a: Automation = {
        id: sid("aut"),
        merchantId,
        trigger,
        enabled: marketingEnabled && ["inactive_30", "birthday", "reward_available"].includes(trigger),
        channel: "email",
        message: autoMessages[trigger],
      };
      db.automations.push(a);
    });

    // ── Campagnes (pour les offres qui les incluent) ───────────
    if (plan.features.campaigns && fx.detailed) {
      const templates: { name: string; channel: Campaign["channel"]; segment: SegmentId; daysAgo: number; subject?: string; message: string }[] = {
        cafe: [
          { name: "Nouvelle carte d'automne", channel: "email" as const, segment: "all" as const, daysAgo: 45, subject: "Nos boissons d'automne sont arrivées", message: "Bonjour {prenom}, chai latte, pumpkin spice et chocolat viennois sont de retour au Café Rouen Centre !" },
          { name: "On vous a manqué ?", channel: "sms" as const, segment: "inactive" as const, daysAgo: 16, message: "{prenom}, votre café vous attend ! -20% sur votre prochaine boisson jusqu'à dimanche. STOP au 36xxx" },
        ],
        barber: [{ name: "Rentrée : réservez votre créneau", channel: "email" as const, segment: "active" as const, daysAgo: 58, subject: "C'est la rentrée chez Barber Studio", message: "Bonjour {prenom}, les créneaux de septembre partent vite : réservez votre coupe dès maintenant." }],
        beauty: [{ name: "Soirée privée Gold", channel: "email" as const, segment: "vip" as const, daysAgo: 21, subject: "Vous êtes invitée à notre soirée privée", message: "Chère {prenom}, en tant que membre de notre cercle, nous vous convions à une soirée découverte le jeudi 16." }],
        restaurant: [{ name: "Menu de saison", channel: "email" as const, segment: "all" as const, daysAgo: 33, subject: "Le menu d'automne est servi", message: "Bonjour {prenom}, découvrez notre nouveau menu de saison. Votre cashback fidélité s'applique comme toujours !" }],
      }[fx.key] ?? [];

      const mCustomers = db.customers.filter((c) => c.merchantId === merchantId);
      const mCards = new Map(db.cards.filter((c) => c.merchantId === merchantId).map((c) => [c.customerId, c]));
      const mTx = db.transactions.filter((x) => x.merchantId === merchantId && x.kind === "earn");

      for (const tpl of templates) {
        const sentAt = now - tpl.daysAgo * DAY_MS;
        const eligible = mCustomers.filter((c) => {
          if (new Date(c.createdAt).getTime() > sentAt) return false;
          if (tpl.segment === "all") return true;
          const card = mCards.get(c.id);
          return card ? segmentOf(c, card, new Date(sentAt)) .includes(tpl.segment) : false;
        });
        const consenting = eligible.filter((c) => c.consent[tpl.channel]);
        const campaignId = sid("cmp");
        const delivered = Math.round(consenting.length * 0.97);
        const consentIds = new Set(consenting.map((c) => c.id));
        const attributed = mTx.filter((x) => {
          const tt = new Date(x.createdAt).getTime();
          return consentIds.has(x.customerId) && tt > sentAt && tt < sentAt + 7 * DAY_MS;
        }).length;
        db.campaigns.push({
          id: campaignId,
          merchantId,
          name: tpl.name,
          channel: tpl.channel,
          segment: tpl.segment,
          subject: tpl.subject,
          message: tpl.message,
          status: "sent",
          sentAt: iso(sentAt),
          createdAt: iso(sentAt - 2 * DAY_MS),
          createdBy: owner.id,
          stats: {
            targeted: eligible.length,
            excludedNoConsent: eligible.length - consenting.length,
            simulatedDelivered: delivered,
            simulatedOpened: tpl.channel === "email" ? Math.round(delivered * 0.44) : 0,
            simulatedClicked: tpl.channel === "email" ? Math.round(delivered * 0.09) : Math.round(delivered * 0.05),
            attributedVisits: attributed,
          },
        });
        for (const c of eligible) {
          const ok = consentIds.has(c.id);
          const log: MessageLog = {
            id: sid("msg"),
            merchantId,
            campaignId,
            customerId: c.id,
            channel: tpl.channel,
            status: ok ? "simulated" : "skipped_no_consent",
            preview: tpl.message.replace("{prenom}", c.firstName).slice(0, 140),
            createdAt: iso(sentAt),
          };
          db.messageLogs.push(log);
        }
      }
      if (fx.key === "cafe") {
        db.campaigns.push({
          id: sid("cmp"),
          merchantId,
          name: "Happy hour du jeudi",
          channel: "email",
          segment: "loyal",
          subject: "Jeudi : votre 2e boisson à moitié prix",
          message: "Bonjour {prenom}, ce jeudi de 16h à 18h, votre deuxième boisson est à -50 %. À jeudi !",
          status: "draft",
          createdAt: iso(now - 2 * DAY_MS),
          createdBy: owner.id,
          stats: { targeted: 0, excludedNoConsent: 0, simulatedDelivered: 0, simulatedOpened: 0, simulatedClicked: 0, attributedVisits: 0 },
        });
      }
    }

    db.auditLogs.push({
      id: sid("aud"),
      actorUserId: owner.id,
      actorLabel: owner.name,
      merchantId,
      action: "merchant.created",
      target: fx.name,
      createdAt: iso(created),
    });
    if (fx.previousRules) {
      db.auditLogs.push({
        id: sid("aud"),
        actorUserId: owner.id,
        actorLabel: owner.name,
        merchantId,
        action: "program.rules_updated",
        target: fx.programName,
        metadata: { from: describeRules(fx.previousRules), to: describeRules(fx.rules), version: 2 },
        createdAt: iso(changeAt),
      });
    }
    if (fx.status === "suspended") {
      db.auditLogs.push({
        id: sid("aud"),
        actorUserId: admin.id,
        actorLabel: admin.name,
        merchantId,
        action: "merchant.suspended",
        target: fx.name,
        metadata: { reason: fx.suspendedReason ?? "" },
        createdAt: iso(now - 20 * DAY_MS),
      });
    }
  }

  // Récompenses arrivées à expiration
  for (const iss of db.issuances) {
    if (iss.status === "available" && new Date(iss.expiresAt).getTime() < now) iss.status = "expired";
  }

  // Tickets support
  const tickets: [string, string, string, "open" | "pending" | "resolved", "low" | "normal" | "high", "question" | "incident" | "billing", number][] = [
    ["mer_cafe", "Imprimer l'affiche QR en A5", "Est-il possible d'avoir un format A5 pour le comptoir ?", "resolved", "low", "question", 40],
    ["mer_barber", "Caméra du scanner refusée sur iPad", "Le navigateur ne propose pas la caméra sur l'iPad du salon.", "resolved", "normal", "incident", 12],
    ["mer_beauty", "Ajouter un 3e établissement", "Nous ouvrons à Mont-Saint-Aignan en janvier.", "open", "normal", "question", 3],
    ["mer_pizzeria", "Échec de prélèvement", "Notre carte bancaire a expiré, comment la mettre à jour ?", "pending", "high", "billing", 18],
    ["mer_restaurant", "Cashback non crédité", "Un client signale un crédit manquant le 12.", "open", "high", "incident", 1],
    ["mer_bakery", "Passer à l'offre Pro ?", "Nous approchons de la limite de 200 clients.", "open", "normal", "billing", 2],
    ["mer_fleurs", "Résiliation", "Fermeture de la boutique, merci de résilier.", "resolved", "low", "billing", 31],
  ];
  for (const [merchantId, subject, body, status, priority, kind, daysAgo] of tickets) {
    db.tickets.push({
      id: sid("tkt"),
      merchantId,
      subject,
      body,
      status,
      priority,
      kind,
      createdAt: iso(now - daysAgo * DAY_MS),
      updatedAt: iso(now - Math.max(0, daysAgo - 2) * DAY_MS),
    });
  }

  db.auditLogs.push({
    id: sid("aud"),
    actorUserId: null,
    actorLabel: "Système",
    merchantId: null,
    action: "demo.seeded",
    target: "Dataset de démonstration",
    metadata: { customers: db.customers.length, transactions: db.transactions.length },
    createdAt: iso(now),
  });

  db.transactions.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  db.auditLogs.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return db;
}
