/**
 * Utility functions for URL embedding in ERP BCS (HRIS LMS, Training, etc.)
 * Supports: YouTube, Google Drive/Docs/Sheets/Slides, Loom, Vimeo, Canva, Figma, and direct web/PDF embeds.
 */

export function formatEmbedUrl(url: string | null | undefined): string {
	if (!url) return '';
	let trimmed = url.trim();
	if (!trimmed) return '';

	// Ensure protocol
	if (!/^https?:\/\//i.test(trimmed)) {
		trimmed = 'https://' + trimmed;
	}

	try {
		const parsed = new URL(trimmed);

		// 1. YouTube: watch, youtu.be, shorts
		if (parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtu.be')) {
			if (parsed.hostname.includes('youtu.be')) {
				const videoId = parsed.pathname.replace(/^\//, '').split(/[?&#]/)[0];
				return `https://www.youtube.com/embed/${videoId}`;
			}
			if (parsed.pathname.includes('/shorts/')) {
				const videoId = parsed.pathname.split('/shorts/')[1]?.split(/[?&#]/)[0];
				return `https://www.youtube.com/embed/${videoId}`;
			}
			if (parsed.pathname.includes('/watch')) {
				const videoId = parsed.searchParams.get('v');
				if (videoId) return `https://www.youtube.com/embed/${videoId}`;
			}
			if (parsed.pathname.includes('/embed/')) {
				return trimmed;
			}
		}

		// 2. Google Drive / Docs / Sheets / Slides
		if (parsed.hostname.includes('drive.google.com')) {
			if (parsed.pathname.includes('/file/d/')) {
				const idMatch = parsed.pathname.match(/\/file\/d\/([^/]+)/);
				if (idMatch && idMatch[1]) {
					return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
				}
			}
		}
		if (parsed.hostname.includes('docs.google.com')) {
			if (parsed.pathname.includes('/presentation/d/')) {
				const idMatch = parsed.pathname.match(/\/presentation\/d\/([^/]+)/);
				if (idMatch && idMatch[1]) {
					return `https://docs.google.com/presentation/d/${idMatch[1]}/embed`;
				}
			}
			if (parsed.pathname.includes('/document/d/')) {
				const idMatch = parsed.pathname.match(/\/document\/d\/([^/]+)/);
				if (idMatch && idMatch[1]) {
					return `https://docs.google.com/document/d/${idMatch[1]}/preview`;
				}
			}
			if (parsed.pathname.includes('/spreadsheets/d/')) {
				const idMatch = parsed.pathname.match(/\/spreadsheets\/d\/([^/]+)/);
				if (idMatch && idMatch[1]) {
					return `https://docs.google.com/spreadsheets/d/${idMatch[1]}/preview`;
				}
			}
		}

		// 3. Loom
		if (parsed.hostname.includes('loom.com')) {
			if (parsed.pathname.includes('/share/')) {
				const videoId = parsed.pathname.split('/share/')[1]?.split(/[?&#]/)[0];
				return `https://www.loom.com/embed/${videoId}`;
			}
			if (parsed.pathname.includes('/embed/')) {
				return trimmed;
			}
		}

		// 4. Vimeo
		if (parsed.hostname.includes('vimeo.com')) {
			if (!parsed.hostname.includes('player.vimeo.com')) {
				const videoId = parsed.pathname.replace(/^\//, '').split('/')[0];
				if (videoId && /^\d+$/.test(videoId)) {
					return `https://player.vimeo.com/video/${videoId}`;
				}
			}
		}

		// 5. Canva
		if (parsed.hostname.includes('canva.com')) {
			if (parsed.pathname.includes('/design/') && !trimmed.includes('embed')) {
				return trimmed + (trimmed.includes('?') ? '&embed' : '?embed');
			}
		}

		// 6. Figma
		if (parsed.hostname.includes('figma.com')) {
			if (!parsed.pathname.includes('/embed')) {
				return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(trimmed)}`;
			}
		}

		return trimmed;
	} catch {
		return trimmed;
	}
}

export function detectEmbedPlatform(url: string | null | undefined): { name: string; icon: string; color: string } {
	if (!url) return { name: 'Unknown', icon: 'link', color: 'slate' };
	const lower = url.toLowerCase();
	if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
		return { name: 'YouTube Video', icon: 'smart_display', color: 'rose' };
	}
	if (lower.includes('docs.google.com/presentation')) {
		return { name: 'Google Slides', icon: 'co_present', color: 'amber' };
	}
	if (lower.includes('docs.google.com/document')) {
		return { name: 'Google Docs', icon: 'description', color: 'blue' };
	}
	if (lower.includes('docs.google.com/spreadsheets')) {
		return { name: 'Google Sheets', icon: 'table_chart', color: 'emerald' };
	}
	if (lower.includes('drive.google.com')) {
		return { name: 'Google Drive File', icon: 'folder_shared', color: 'sky' };
	}
	if (lower.includes('loom.com')) {
		return { name: 'Loom Video', icon: 'videocam', color: 'indigo' };
	}
	if (lower.includes('vimeo.com')) {
		return { name: 'Vimeo Video', icon: 'play_circle', color: 'cyan' };
	}
	if (lower.includes('canva.com')) {
		return { name: 'Canva Presentation', icon: 'palette', color: 'teal' };
	}
	if (lower.includes('figma.com')) {
		return { name: 'Figma Embed', icon: 'draw', color: 'purple' };
	}
	if (lower.endsWith('.pdf') || lower.includes('.pdf?')) {
		return { name: 'PDF Document', icon: 'picture_as_pdf', color: 'red' };
	}
	return { name: 'Web Embed / Iframe', icon: 'public', color: 'slate' };
}
