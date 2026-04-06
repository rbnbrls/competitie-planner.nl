import io
from datetime import datetime
from uuid import UUID

from reportlab.graphics.barcode import qr
from reportlab.graphics.shapes import Drawing
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models import (
    BaanToewijzing,
    Club,
    Competitie,
    Speelronde,
)


class PDFService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def generate_banenindeling_pdf(
        self,
        ronde_id: UUID,
    ) -> bytes:
        result = await self.db.execute(
            select(Speelronde)
            .where(Speelronde.id == ronde_id)
            .options(joinedload(Speelronde.competitie), joinedload(Speelronde.baantoewijzingen).joinedload(BaanToewijzing.baan), joinedload(Speelronde.baantoewijzingen).joinedload(BaanToewijzing.team))
        )
        ronde = result.scalar_one_or_none()
        if not ronde:
            raise ValueError("Ronde not found")

        result = await self.db.execute(select(Club).where(Club.id == ronde.club_id))
        club = result.scalar_one_or_none()
        if not club:
            raise ValueError("Club not found")

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=15 * mm,
            leftMargin=15 * mm,
            topMargin=15 * mm,
            bottomMargin=15 * mm
        )

        styles = getSampleStyleSheet()

        # Custom styles
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontSize=28,
            spaceAfter=10,
            fontName='Helvetica-Bold'
        )

        subtitle_style = ParagraphStyle(
            'SubtitleStyle',
            parent=styles['Normal'],
            fontSize=18,
            spaceAfter=20,
            textColor=colors.grey,
            fontName='Helvetica-Bold'
        )

        club_name_style = ParagraphStyle(
            'ClubNameStyle',
            parent=styles['Normal'],
            fontSize=14,
            textColor=colors.blue,
            fontName='Helvetica-Bold',
            textTransform='uppercase'
        )

        elements = []

        # Header section
        header_data = [
            [
                [
                    Paragraph("Banenindeling", title_style),
                    Paragraph(ronde.datum.strftime("%A %d %B %Y"), subtitle_style),
                    Paragraph(club.naam, club_name_style),
                ],
                "" # Logo placeholder
            ]
        ]

        header_table = Table(header_data, colWidths=[140*mm, 40*mm])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 20),
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 10 * mm))

        # Table data
        data = [['Baan', 'Team / Wedstrijd', 'Tijd']]

        # Sort toewijzingen by baan number
        sorted_toewijzingen = sorted(ronde.baantoewijzingen, key=lambda x: x.baan.nummer if x.baan else 0)

        for t in sorted_toewijzingen:
            team_naam = t.team.naam if t.team else "-"
            tijd = f"{t.tijdslot_start.strftime('%H:%M')} - {t.tijdslot_eind.strftime('%H:%M') if t.tijdslot_eind else ''}"

            team_info = [
                Paragraph(f"<b>{team_naam}</b>", styles['Normal']),
            ]
            if t.notitie:
                team_info.append(Paragraph(f"<i>{t.notitie}</i>", styles['Normal']))

            data.append([
                str(t.baan.nummer) if t.baan else "-",
                team_info,
                tijd
            ])

        # Table styling
        t_style = TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F3F4F6")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 16),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('TOPPADDING', (0, 0), (-1, 0), 12),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('FONTSIZE', (0, 1), (-1, -1), 14),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 15),
            ('TOPPADDING', (0, 1), (-1, -1), 15),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'), # Center Baan column
            ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 1), (0, -1), 20),
        ])

        table = Table(data, colWidths=[25*mm, 115*mm, 40*mm])
        table.setStyle(t_style)
        elements.append(table)

        # Footer section with QR code
        elements.append(Spacer(1, 40 * mm))

        # public_url = f"https://display.competitie-planner.nl/{club.slug}/{ronde.public_token}"
        # For development, we use a generic domain
        public_url = f"https://display.competitie-planner.nl/{club.slug}"
        if ronde.public_token:
            public_url += f"/{ronde.public_token}"

        qr_code = qr.QrCodeWidget(public_url)
        bounds = qr_code.getBounds()
        width = bounds[2] - bounds[0]
        height = bounds[3] - bounds[1]
        d = Drawing(35*mm, 35*mm, transform=[35*mm/width, 0, 0, 35*mm/height, 0, 0])
        d.add(qr_code)

        footer_data = [
            [
                [
                    Paragraph("<b>Live stand & wijzigingen</b>", ParagraphStyle('F1', fontSize=14, spaceAfter=5)),
                    Paragraph("Scan de QR-code voor de meest actuele banenindeling, uitslagen en live updates.", styles['Normal']),
                    Spacer(1, 5*mm),
                    Paragraph(f"<font color='grey' size='8'>{public_url}</font>", styles['Normal'])
                ],
                d
            ]
        ]

        footer_table = Table(footer_data, colWidths=[140*mm, 40*mm])
        footer_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'BOTTOM'),
            ('LINEABOVE', (0,0), (-1,0), 1, colors.grey),
            ('TOPPADDING', (0,0), (-1,0), 10),
        ]))
        elements.append(footer_table)

        # Generated text
        elements.append(Spacer(1, 10 * mm))
        elements.append(Paragraph(f"<i>Gegenereerd door Competitie-Planner.nl op {datetime.now().strftime('%d-%m-%Y %H:%M')}</i>", ParagraphStyle('Gen', fontSize=8, alignment=1, textColor=colors.grey)))

        doc.build(elements)
        content = buffer.getvalue()
        buffer.close()
        return content

    async def generate_seizoensoverzicht_pdf(
        self,
        competitie_id: UUID,
    ) -> bytes:
        # Fallback to simple HTML for now or implement similarly to above
        # For this task, we focus on the print-optimized ronde overview
        result = await self.db.execute(
            select(Competitie).where(Competitie.id == competitie_id)
        )
        competitie = result.scalar_one_or_none()
        if not competitie:
            raise ValueError("Competitie not found")

        result = await self.db.execute(select(Club).where(Club.id == competitie.club_id))
        result.scalar_one_or_none()  # reserved for future use

        # For now, return a placeholder or implement if needed
        # The user specifically asked for "Print-optimized CSS layout per speeldag"
        # and "A4 format, grote letters" which matches the generate_banenindeling_pdf.

        return b"%PDF-1.4\nSeizoensoverzicht placeholder\n"
