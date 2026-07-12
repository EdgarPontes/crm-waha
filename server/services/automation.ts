import {
  getOrCreateContact,
  getContactByWhatsappNumber,
  getOrCreateConversation,
  createMessage,
  getLeadById,
  moveLeadToStage,
  addTagToLead,
  assignConversationToUser,
  createAuditLog,
  listActiveAutomations,
} from "../db";
import { getWAHAClient } from "../waha-client";

interface CheckResult {
  shouldTrigger: boolean;
  reason: string;
}

interface ActionContext {
  conversationId: number;
  sessionName: string;
  from: string;
  phoneNumber: string;
  userMessage: string;
  contactId: number;
}

export async function checkAndExecuteAutomations(context: ActionContext) {
  const { conversationId, sessionName, from, phoneNumber, userMessage, contactId } = context;
  
  const contact = await getContactByWhatsappNumber(phoneNumber);
  if (!contact) {
    console.error(
      `[Automation] Contato ${phoneNumber} não encontrado para automação`
    );
    return;
  }

  const conversation = await getOrCreateConversation(contactId);
  if (!conversation || conversation.status !== "active") {
    return;
  }

  const activeAutomations = await listActiveAutomations();
  if (!activeAutomations || activeAutomations.length === 0) {
    return;
  }

  for (const automation of activeAutomations) {
    const result = await checkAutomation(automation, contact, userMessage, conversation);
    if (result.shouldTrigger) {
      await executeAutomationAction(automation, sessionName, {
        from,
        phoneNumber,
        userMessage,
        conversationId,
        sessionName,
      });
    }
  }
}

async function checkAutomation(
  automation: any,
  contact: any,
  message: string,
  conversation: any
): Promise<CheckResult> {
  const { trigger, triggerValue } = automation;

  switch (trigger) {
    case "message_contains":
      return checkMessageContains(message, triggerValue);
    case "response_yes":
      return checkResponseYes(message);
    case "inactivity_hours":
      return checkInactivityHours(conversation, parseInt(triggerValue));
    default:
      return { shouldTrigger: false, reason: "Tipo de gatilho não suportado" };
  }
}

function checkMessageContains(message: string, triggerValue: string): CheckResult {
  if (!message || !triggerValue) {
    return { shouldTrigger: false, reason: "Mensagem ou valor do gatilho não fornecido" };
  }

  const lowerMessage = message.toLowerCase();
  const lowerValue = triggerValue.toLowerCase();
  
  return {
    shouldTrigger: lowerMessage.includes(lowerValue),
    reason: lowerMessage.includes(lowerValue) 
      ? `Mensagem contém "${triggerValue}"` 
      : `Mensagem não contém "${triggerValue}"`,
  };
}

function checkResponseYes(message: string): CheckResult {
  const positiveResponses = [
    "sim", "s", "yes", "y", "claro", "conforme",
    "aceito", "vou", "quero", "gostaria", "preciso"
  ];
  
  const lowerMessage = message.toLowerCase().trim();
  
  const isPositive = positiveResponses.some((term) => lowerMessage.includes(term));
  return {
    shouldTrigger: isPositive,
    reason: isPositive 
      ? "Resposta positiva detectada" 
      : "Não é uma resposta positiva",
  };
}

async function checkInactivityHours(
  conversation: any,
  hoursThreshold: number
): Promise<CheckResult> {
  const lastMessageAt = new Date(conversation.lastMessageAt);
  const now = new Date();
  const hoursSinceLastMessage = (now.getTime() - lastMessageAt.getTime()) / (1000 * 60 * 60);

  return {
    shouldTrigger: hoursSinceLastMessage >= hoursThreshold,
    reason: `Última mensagem há ${Math.floor(hoursSinceLastMessage)} horas (>= ${hoursThreshold})`,
  };
}

async function executeAutomationAction(
  automation: any,
  sessionName: string,
  context: ActionContext
) {
  const { from, phoneNumber, userMessage, conversationId, sessionName: contextSessionName } = context;
  const { action, actionValue } = automation;

  try {
    console.log(
      `[Automation] Executando ação "${automation.action}" para ${phoneNumber}: ${JSON.stringify(actionValue)}`
    );

    switch (action) {
      case "move_stage":
        await executeMoveStage(automation, conversationId, phoneNumber);
        break;
      case "send_message":
        await executeSendMessage(automation, sessionName, phoneNumber, actionValue);
        break;
      case "add_tag":
        await executeAddTag(automation, conversationId, phoneNumber);
        break;
      case "assign_user":
        await executeAssignUser(automation, conversationId, phoneNumber);
        break;
      default:
        console.error(
          `[Automation] Ação não suportada: ${action}`
        );
    }

    await createAuditLog(undefined, "automation_triggered", "automation", automation.id, {
      automationId: automation.id,
      automationName: automation.name,
      trigger: automation.trigger,
      action: automation.action,
      sessionName: contextSessionName,
      phoneNumber,
    });

  } catch (error) {
    console.error(
      `[Automation] Erro ao executar automação ${automation.id}: ${error.message}`,
      {
        automationId: automation.id,
        error: error.message,
      }
    );

    await createAuditLog(undefined, "automation_error", "automation", automation.id, {
      automationId: automation.id,
      error: error.message,
    });
  }
}

async function executeMoveStage(
  automation: any,
  conversationId: number,
  phoneNumber: string
) {
  const actionValue = automation.actionValue as any;
  const stageId = actionValue?.stageId;

  if (!stageId) {
    throw new Error("stageId não fornecido na actionValue da automação");
  }

  const conversation = await getOrCreateConversationByPhone(phoneNumber);
  if (!conversation) {
    throw new Error("Conversa não encontrada");
  }

  const lead = await getLeadById(conversation.leadId);
  if (!lead) {
    throw new Error("Lead não encontrado");
  }

  await moveLeadToStage(lead.id, stageId);

  const contact = await getContactById(lead.contactId);
  await createMessage(conversation.id, "text",
    `Automação ativada: Lead movido para o estágio '${stageId}'`, undefined, undefined,
    undefined, undefined, { automationTriggered: true, automationId: automation.id });
}

async function executeSendMessage(
  automation: any,
  sessionName: string,
  phoneNumber: string,
  actionValue: any
) {
  const message = actionValue?.message;

  if (!message) {
    throw new Error("Mensagem não fornecida na actionValue da automação");
  }

  const wahaClient = getWAHAClient(sessionName);
  await wahaClient.sendMessage(phoneNumber, message);
}

async function executeAddTag(
  automation: any,
  conversationId: number,
  phoneNumber: string
) {
  const actionValue = automation.actionValue as any;
  const tagName = actionValue?.tagName;

  if (!tagName) {
    throw new Error("tagName não fornecido na actionValue da automação");
  }

  const conversation = await getOrCreateConversationByPhone(phoneNumber);
  if (!conversation) {
    throw new Error("Conversa não encontrada");
  }

  const lead = await getLeadById(conversation.leadId);
  if (!lead) {
    throw new Error("Lead não encontrado");
  }

  await addTagToLead(lead.id, tagName);
}

async function executeAssignUser(
  automation: any,
  conversationId: number,
  phoneNumber: string
) {
  const actionValue = automation.actionValue as any;
  const userId = actionValue?.userId;

  if (!userId) {
    throw new Error("userId não fornecido na actionValue da automação");
  }

  const conversation = await getOrCreateConversationByPhone(phoneNumber);
  if (!conversation) {
    throw new Error("Conversa não encontrada");
  }

  await assignConversationToUser(conversationId, userId);
  await createMessage(conversation.id, "text",
    `Automação ativada: Conversa atribuída ao atendente ${userId}`, undefined, undefined,
    undefined, undefined, { automationTriggered: true, automationId: automation.id });
}

async function getOrCreateConversationByPhone(phoneNumber: string) {
  const contact = await getContactByWhatsappNumber(phoneNumber);
  if (!contact) {
    throw new Error("Contato não encontrado");
  }

  return await getOrCreateConversation(contact.id);
}