export interface GenerateLyricsParams {
  themes: string[];
  lyricsReference: string;
}

export interface GenerateLyricsResponse {
  lyrics: string;
  error?: string;
}

/**
 * Generates song lyrics using OpenAI API based on themes and reference text
 * @param params - Object containing themes array and lyricsReference string
 * @returns Promise with generated lyrics or error
 */
export async function generateLyrics(
  params: GenerateLyricsParams
): Promise<GenerateLyricsResponse> {
  try {
    const { themes, lyricsReference } = params;

    const response = await fetch('/api/generate-lyrics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        themes,
        lyricsReference: lyricsReference.trim(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to generate lyrics' }));
      throw new Error(errorData.error || 'Failed to generate lyrics');
    }

    const data = await response.json();
    return { lyrics: data.lyrics || '' };
  } catch (error) {
    console.error('Error generating lyrics:', error);
    return {
      lyrics: '',
      error: error instanceof Error ? error.message : 'Failed to generate lyrics',
    };
  }
}

