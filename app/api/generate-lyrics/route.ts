import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { themes, lyricsReference } = await request.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    // Build the prompt
    const themesText = themes && themes.length > 0 
      ? `Themes: ${themes.join(', ')}`
      : '';
    
    const referenceText = lyricsReference && lyricsReference.trim()
      ? `Lyrics Reference: ${lyricsReference}`
      : '';

    const prompt = `Generate song lyrics in the following format with timestamps. Each line should have a timestamp in the format [MM:SS.mmm] followed by the lyric line.

${themesText ? themesText + '\n' : ''}${referenceText ? referenceText + '\n' : ''}

Requirements:
- Generate a complete song (2-4 minutes long)
- Use timestamps in the format [MM:SS.mmm] for each line
- Timestamps should be sequential and realistic (typically 2-4 seconds between lines)
- Include verses, choruses, and optionally a bridge
- Make the lyrics match the themes and reference provided
- Format each line as: [MM:SS.mmm] Lyric text here

Example format:
[00:04.074] Tell me that I'm special
[00:06.226] Tell me I look pretty
[00:08.175] Tell me I'm a little angel

Generate the lyrics now:`;

    // Use the cheapest model (gpt-4o-mini or gpt-3.5-turbo)
    const model = 'gpt-4o-mini'; // Cheapest model available

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a professional songwriter. Generate song lyrics with timestamps in the exact format specified.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 2000,
    });

    const generatedLyrics = completion.choices[0]?.message?.content || '';

    return NextResponse.json({ lyrics: generatedLyrics });
  } catch (error) {
    console.error('Error generating lyrics:', error);
    return NextResponse.json(
      { error: 'Failed to generate lyrics' },
      { status: 500 }
    );
  }
}

