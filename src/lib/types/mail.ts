/**
 * Type Definitions for ERP Mail & Notification Center
 * PT Buana Centra Swakarsa (BCS Logistics)
 */

export interface EmailAttachment {
	id: string;
	filename: string;
	size: string;
	mimeType: string;
	downloadUrl?: string;
}

export type EmailCategory = 'inbox' | 'sent' | 'drafts' | 'trash' | 'system' | 'approvals';

export interface EmailMessage {
	id: string;
	folder: EmailCategory;
	fromName: string;
	fromEmail: string;
	toName: string;
	toEmail: string;
	subject: string;
	preview: string;
	bodyHtml?: string;
	bodyText?: string;
	date: string; // ISO date string or formatted
	timestamp: number;
	isRead: boolean;
	isStarred: boolean;
	hasAttachments: boolean;
	attachments?: EmailAttachment[];
	priority?: 'normal' | 'high' | 'urgent';
	badge?: {
		text: string;
		variant: 'amber' | 'emerald' | 'rose' | 'sky' | 'indigo' | 'purple';
	};
	serverId?: string;
	accountBadge?: {
		label: string;
		variant: 'slate' | 'orange' | 'blue' | 'rose' | 'emerald';
	};
}

export type MailProviderType = 'bcs-corporate' | 'gmail' | 'office365' | 'custom';

export interface MailServerProfile {
	id: string;
	name: string;
	domain: string;
	providerType: MailProviderType;
	isDefault: boolean;
	isActive: boolean;

	// Inbound (IMAP / POP3)
	inboundProtocol: 'IMAP' | 'POP3';
	inboundHost: string;
	inboundPort: number;
	inboundEncryption: 'SSL' | 'TLS' | 'STARTTLS' | 'NONE';
	inboundUsername: string;

	// Outbound (SMTP)
	smtpHost: string;
	smtpPort: number;
	smtpEncryption: 'TLS' | 'SSL' | 'STARTTLS' | 'NONE';
	smtpUsername: string;
	smtpFromEmail: string;
	smtpFromName: string;

	// Security & Settings
	authRequired: boolean;
	verifySsl: boolean;
	timeoutSeconds: number;
	note?: string;
}

export interface MailServerConfig {
	// Inbound
	inboundProtocol: 'IMAP' | 'POP3';
	inboundHost: string;
	inboundPort: number;
	inboundEncryption: 'SSL' | 'TLS' | 'STARTTLS' | 'NONE';
	inboundUsername: string;

	// Outbound
	smtpHost: string;
	smtpPort: number;
	smtpEncryption: 'TLS' | 'SSL' | 'STARTTLS' | 'NONE';
	smtpUsername: string;
	smtpFromEmail: string;
	smtpFromName: string;

	// Security & Domains
	corporateDomain: string;
	authRequired: boolean;
	verifySsl: boolean;
	timeoutSeconds: number;
}
