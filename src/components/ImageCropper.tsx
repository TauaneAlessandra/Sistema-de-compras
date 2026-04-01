// ============================================================
// ImageCropper.tsx — Modal de recorte de imagem
//
// Usa a biblioteca "react-easy-crop" para exibir uma interface
// de recorte dentro de um modal compacto.
//
// Fluxo:
// 1. Usuário seleciona uma imagem → NewRequest passa a URL base64 via imageSrc
// 2. O usuário arrasta/redimensiona o recorte
// 3. Ao clicar em Confirmar, getCroppedImage() usa o Canvas do navegador
//    para cortar a imagem e retornar um novo base64 (JPEG comprimido)
// 4. onConfirm(dataUrl) devolve a imagem recortada para o componente pai
// ============================================================

import { useState, useCallback } from 'react'
import Cropper, { Area } from 'react-easy-crop'
import { X, Check, ZoomIn, ZoomOut } from 'lucide-react'

interface Props {
  imageSrc: string                          // URL base64 da imagem original
  onConfirm: (croppedDataUrl: string) => void // chamado com a imagem recortada
  onCancel: () => void                      // chamado ao cancelar
}

// Função assíncrona que usa a API Canvas do navegador para recortar a imagem.
// pixelCrop contém as coordenadas e dimensões exatas da área selecionada.
async function getCroppedImage(imageSrc: string, pixelCrop: Area): Promise<string> {
  // Carrega a imagem em um elemento <img> temporário (fora do DOM)
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', reject)
    img.src = imageSrc
  })

  // Cria um canvas com o tamanho exato do recorte
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!  // "!" = garantimos que o contexto existe

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  // drawImage(fonte, sx, sy, sw, sh, dx, dy, dw, dh)
  // sx,sy = posição de início na imagem original
  // sw,sh = tamanho a recortar na original
  // dx,dy = posição no canvas de destino (0,0 = canto superior esquerdo)
  // dw,dh = tamanho no canvas de destino
  ctx.drawImage(
    image,
    pixelCrop.x,       // x na imagem original
    pixelCrop.y,       // y na imagem original
    pixelCrop.width,   // largura a recortar
    pixelCrop.height,  // altura a recortar
    0, 0,              // destino no canvas
    pixelCrop.width,
    pixelCrop.height,
  )

  // Converte o canvas para string base64 no formato JPEG com 85% de qualidade
  // (menor que PNG mas com boa qualidade visual)
  return canvas.toDataURL('image/jpeg', 0.85)
}

export default function ImageCropper({ imageSrc, onConfirm, onCancel }: Props) {
  // Posição atual do centro do recorte
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  // Nível de zoom (1 = sem zoom, 3 = 3x ampliado)
  const [zoom, setZoom] = useState(1)
  // Coordenadas em pixels da área recortada (preenchida pelo react-easy-crop)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  // Controla o estado de carregamento ao confirmar
  const [loading, setLoading] = useState(false)

  // useCallback memoriza a função para evitar recriá-la a cada render.
  // O react-easy-crop chama isso sempre que o usuário termina de mover/zoom.
  // O primeiro argumento (_: Area) é ignorado (área percentual), usamos o segundo (pixels).
  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  // Ao confirmar: gera a imagem recortada e repassa ao pai
  async function handleConfirm() {
    if (!croppedAreaPixels) return
    setLoading(true)
    try {
      const cropped = await getCroppedImage(imageSrc, croppedAreaPixels)
      onConfirm(cropped)
    } finally {
      // finally sempre executa, mesmo se getCroppedImage lançar erro
      setLoading(false)
    }
  }

  return (
    // Overlay escuro cobrindo a tela — posição fixed + z-50
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      {/* Card do modal — largura máxima limitada para não ficar enorme */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Cabeçalho do modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <p className="font-semibold text-slate-800 text-sm">Recortar imagem</p>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={18} />
          </button>
        </div>

        {/* Área do cropper — altura fixa de 280px com fundo escuro */}
        <div className="relative bg-slate-900" style={{ height: 280 }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={4 / 3}              // proporção 4:3 (formato paisagem)
            onCropChange={setCrop}       // atualiza posição ao arrastar
            onZoomChange={setZoom}       // atualiza zoom (pelo pinch ou roda do mouse)
            onCropComplete={onCropComplete} // salva coordenadas finais
          />
        </div>

        {/* Controle de zoom */}
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-xs font-medium text-slate-500 mb-2">Zoom</p>
          <div className="flex items-center gap-3">
            {/* Botão diminuir zoom — Math.max garante mínimo de 1 */}
            <button
              onClick={() => setZoom((z) => Math.max(1, +(z - 0.1).toFixed(2)))}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
            >
              <ZoomOut size={15} />
            </button>
            {/* Slider de zoom — range de 1 a 3 em passos de 0.05 */}
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-blue-600"
            />
            {/* Botão aumentar zoom — Math.min garante máximo de 3 */}
            <button
              onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
            >
              <ZoomIn size={15} />
            </button>
            <span className="text-xs text-slate-400 w-8 text-right">{zoom.toFixed(1)}x</span>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex gap-3 px-5 py-4">
          <button
            onClick={onCancel}
            className="flex-1 border border-slate-300 text-slate-600 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}  // desabilita enquanto está processando
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Check size={15} />
            {loading ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}
