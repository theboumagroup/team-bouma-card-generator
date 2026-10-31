import {
  Document,
  Packer,
  Paragraph,
  ImageRun,
  HorizontalPositionRelativeFrom,
  VerticalPositionRelativeFrom
} from 'docx';
export const WIDTH = 576,
  HEIGHT = 384,
  SCALE = 300 / 96;
export function imagePosition(settings) {
  return {
    x: 0.5 + Number(settings.x) / 25.4,
    y: (settings.panel === 'bottom' ? 5 : 0) + 0.5 + Number(settings.y) / 25.4
  };
}
export async function wordBlob(canvas, settings) {
  const p = imagePosition(settings);
  const image = new ImageRun({
    type: 'png',
    data: canvas.toDataURL('image/png').split(',')[1],
    transformation: { width: WIDTH, height: HEIGHT },
    floating: {
      horizontalPosition: {
        relative: HorizontalPositionRelativeFrom.PAGE,
        offset: Math.round(p.x * 914400)
      },
      verticalPosition: {
        relative: VerticalPositionRelativeFrom.PAGE,
        offset: Math.round(p.y * 914400)
      },
      allowOverlap: true,
      behindDocument: false,
      layoutInCell: false,
      lockAnchor: true
    }
  });
  return Packer.toBlob(
    new Document({
      creator: 'Team Bouma Card Generator',
      sections: [
        {
          properties: {
            page: {
              size: { width: 10080, height: 14400 },
              margin: {
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                header: 0,
                footer: 0
              }
            }
          },
          children: [
            new Paragraph({
              spacing: { before: 0, after: 0 },
              children: [image]
            })
          ]
        }
      ]
    })
  );
}
export function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export function filename(names) {
  return `Thank You Card - ${
    names
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
      .trim()
      .slice(0, 80) || 'Card'
  }.docx`;
}
