export async function validateAuthorityPhoto(file: File): Promise<void> {
  if (
    !/\.(jpe?g|png|webp)$/i.test(file.name) ||
    (file.type && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
  )
    throw new Error('Selecciona una imagen JPG, JPEG, PNG o WebP válida.')
  if (file.size > 5120 * 1024)
    throw new Error(
      'La imagen supera el límite de referencia de 5120 KB. El servidor confirma su límite configurado.',
    )
  const bitmap = await createImageBitmap(file)
  try {
    if (bitmap.width > 8000 || bitmap.height > 8000)
      throw new Error('La imagen no debe superar 8000 × 8000 píxeles.')
  } finally {
    bitmap.close()
  }
}
