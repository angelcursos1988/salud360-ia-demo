export const generatePatientReport = async (patient, messages) => {
  console.log("Iniciando generador para:", patient.name);
  
  try {
    // Carga la librería solo en el momento de uso (evita errores en Vercel)
    const html2pdf = (await import('html2pdf.js')).default;

    // Creamos el contenedor del PDF
    const element = document.createElement('div');
    element.style.padding = '40px';
    element.style.fontFamily = 'Arial, sans-serif';
    
    // Construimos el HTML del reporte
    element.innerHTML = `
      <div style="color: #2c3e50;">
        <h1 style="color: #16a085; border-bottom: 2px solid #16a085; padding-bottom: 10px;">
          Informe Clínico Salud360
        </h1>
        <p><strong>Paciente:</strong> ${patient.name}</p>
        <p><strong>Fecha de Emisión:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>ID de Seguimiento:</strong> ${patient.id}</p>
        
        <h2 style="margin-top: 30px; border-bottom: 1px solid #eee;">Historial de Conversación</h2>
        <div style="margin-top: 20px;">
          ${messages.map(m => `
            <div style="margin-bottom: 15px; padding: 10px; background: #f9f9f9; border-radius: 5px;">
              <strong style="color: ${m.role === 'user' ? '#2980b9' : '#27ae60'}">
                ${m.role === 'user' ? 'Paciente' : 'Asistente IA'}:
              </strong>
              <p style="margin: 5px 0;">${m.content || m.message || ''}</p>
            </div>
          `).join('')}
        </div>
        
        <footer style="margin-top: 40px; font-size: 10px; color: #95a5a6; text-align: center;">
          Documento generado automáticamente. Requiere revisión médica.
        </footer>
      </div>
    `;

    // Configuración de la librería
    const opt = {
      margin: 0.5,
      filename: `Informe_${patient.name.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    // Ejecutamos la descarga
    await html2pdf().set(opt).from(element).save();
    console.log("PDF descargado con éxito");

  } catch (error) {
    console.error("Error en el generador de PDF:", error);
    alert("Hubo un error al crear el archivo PDF.");
  }
};