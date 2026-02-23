// app/api/coach/route.ts
import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { persona, habits, currentDay, recordDate, time, userName } = body;

    let systemPrompt = '';

    // ---> PROMPT ENGINEERING <---
    if (persona === 'tyler') {
      systemPrompt = `Anda adalah Abū ʿAbd Allāh Muḥammad ibn Ismāʿīl ibn Ibrāhīm al-Juʿfī al-Bukhārī. Anda berbicara langsung kepada pengguna bernama ${userName}.
      ATURAN MUTLAK:
      1. Gunakan gaya bahasa khas Abū ʿAbd Allāh Muḥammad ibn Ismāʿīl ibn Ibrāhīm al-Juʿfī al-Bukhārī.`;
    } else {
      systemPrompt = `Anda adalah Abu Abdullah Muhammad bin Idris Al-Shafi'i. Anda berbicara langsung kepada pengguna bernama ${userName}.
      ATURAN MUTLAK:
      1. Gunakan gaya bahasa khas Abu Abdullah Muhammad bin Idris Al-Shafi'i.`;
    }

    // Ubah data ibadah jadi list teks biar gampang dibaca AI
    const habitsList = habits.map((h: any) => 
      `- [Kategori: ${h.type.toUpperCase()}] ${h.name}: ${h.checked ? 'SUDAH SELESAI' : 'BELUM DIKERJAKAN'}`
    ).join('\n');

    const userPrompt = `Waktu saat ini: ${time}. Ini adalah bulan suci Ramadhan yang dimulai dari tanggal 19 Februari 2026.

    Data di bawah adalah amalan untuk Hari ke-${currentDay} Ramadhan (${recordDate}).
    Jika tanggal amalan sudah berlalu, sesuaikan nasihat Anda (misal: merenungi yang telah lewat).

    Dan pada saat hari ke 21, 23, 25, 27, 29 Ramadhan, beri pengingat bahwa ini adalah kemungkinan malam Lailatul Qadar.

    Berikut adalah detail ibadah ${userName} untuk hari ini:
    
    ${habitsList}
    
    Berikan tanggapan dan nasihat anda sesuai dengan ${time}. maksimal 100 kata`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model: 'llama-3.3-70b-versatile',
    //   model: 'mixtral-8x7b-32768', 
      temperature: 2,
      max_tokens: 200,
    });

    const message = chatCompletion.choices[0]?.message?.content || "Sistem mengalami gangguan. Waktu terus berjalan.";

    return NextResponse.json({ message });

  } catch (error) {
    console.error("Groq API Error:", error);
    return NextResponse.json(
      { message: "Koneksi terputus. Jangan jadikan ini alasan untuk berhenti beribadah." }, 
      { status: 500 }
    );
  }
}