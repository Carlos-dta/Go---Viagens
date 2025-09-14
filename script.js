let map;
let startPoint = null;
let endPoint = null;
let routeLine = null;
let destinationMarker = null;

function initMap() {
  map = L.map("map");

  // Camada de tiles
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);

  // Tenta obter localização real do usuário
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        // Centraliza o mapa na localização do usuário
        map.setView([lat, lon], 15);

        // Adiciona marcador do usuário
        const userIcon = L.divIcon({
          html: "📍",
          iconSize: [30, 30],
          className: "user-marker",
        });

        const userMarker = L.marker([lat, lon], { icon: userIcon }).addTo(map);
        userMarker.bindPopup("🏠 Você está aqui").openPopup();

        // Define ponto inicial
        startPoint = [lat, lon];
      },
      (error) => {
        console.log("Erro de geolocalização:", error);
        // Fallback para Vitória-ES
        map.setView([-20.2976, -40.2958], 13);
        startPoint = [-20.2976, -40.2958];

        const userIcon = L.divIcon({
          html: "📍",
          iconSize: [30, 30],
          className: "user-marker",
        });

        L.marker(startPoint, { icon: userIcon })
          .addTo(map)
          .bindPopup("🏠 Localização padrão - Vitória, ES")
          .openPopup();
      }
    );
  } else {
    // Fallback se geolocalização não estiver disponível
    map.setView([-20.2976, -40.2958], 13);
    startPoint = [-20.2976, -40.2958];

    const userIcon = L.divIcon({
      html: "📍",
      iconSize: [30, 30],
      className: "user-marker",
    });

    L.marker(startPoint, { icon: userIcon })
      .addTo(map)
      .bindPopup("🏠 Localização padrão - Vitória, ES")
      .openPopup();
  }
}

// Função para calcular distância simples
function calcularDistanciaSimples(lat1, lon1, lat2, lon2) {
  const R = 6371; // Raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Função para calcular rota usando API ou fallback
async function calcularRota(origem, destino) {
  try {
    // Usar API do OpenRouteService para rota real
    const API_KEY =
      "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjlhMGE5NGMxZTM2NjQzNjRhNmVmZjRjZDM3ZDZhNTBmIiwiaCI6Im11cm11cjY0In0=";
    const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${API_KEY}&start=${origem[1]},${origem[0]}&end=${destino[1]},${destino[0]}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json, application/geo+json",
      },
    }).catch((err) => {
      throw new Error(`Erro de rede: ${err.message}`);
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const data = await response.json();

    if (data.features && data.features[0]) {
      const coordinates = data.features[0].geometry.coordinates;
      const route = coordinates.map((coord) => [coord[1], coord[0]]);
      const distance = data.features[0].properties.segments[0].distance / 1000; // em km
      const duration = data.features[0].properties.segments[0].duration / 60; // em minutos

      console.log("✅ Rota calculada via API");
      return {
        success: true,
        route: route,
        distance: distance.toFixed(2),
        duration: Math.round(duration),
      };
    } else {
      throw new Error("Nenhuma rota encontrada");
    }
  } catch (error) {
    console.log("⚠️ API indisponível, usando roteamento local:", error.message);
    // Fallback para rota direta
    return calcularRotaSimples(origem, destino);
  }
}

// Função fallback para rota simples
function calcularRotaSimples(origem, destino) {
  const distance = calcularDistanciaSimples(
    origem[0],
    origem[1],
    destino[0],
    destino[1]
  );

  // Cria uma rota com pontos intermediários para simular ruas
  const route = [];
  const steps = 8;

  for (let i = 0; i <= steps; i++) {
    const lat = origem[0] + (destino[0] - origem[0]) * (i / steps);
    const lng = origem[1] + (destino[1] - origem[1]) * (i / steps);

    // Adiciona pequenas variações para simular curvas
    const offsetLat = (Math.random() - 0.5) * 0.001;
    const offsetLng = (Math.random() - 0.5) * 0.001;

    route.push([lat + offsetLat, lng + offsetLng]);
  }

  console.log("🔄 Usando roteamento local simulado");

  return {
    success: false,
    route: route,
    distance: distance.toFixed(2),
    duration: Math.round(distance * 2), // Estimativa: 2 min por km
  };
}

// Função para obter nome da rua
async function obterNomeRua(lat, lng) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    ).catch((err) => {
      console.log("Erro de rede ao obter endereço:", err);
      return null;
    });

    if (!response) return "Localização selecionada";

    const data = await response.json();

    if (data && data.display_name) {
      const endereco = data.address;
      let nomeRua = "";

      if (endereco.road) {
        nomeRua = endereco.road;
        if (endereco.suburb || endereco.neighbourhood) {
          nomeRua += `, ${endereco.suburb || endereco.neighbourhood}`;
        }
      } else {
        const partes = data.display_name.split(",").slice(0, 2);
        nomeRua = partes.join(",");
      }

      return nomeRua || "Localização selecionada";
    }
  } catch (error) {
    console.log("Erro ao obter nome da rua:", error);
  }

  return "Destino selecionado";
}

// Captura clique no mapa para definir destino
function setupMapClick() {
  map.on("click", async function (e) {
    if (!startPoint) {
      alert("⏳ Aguardando localização inicial...");
      return;
    }

    endPoint = [e.latlng.lat, e.latlng.lng];

    // Remove marcadores e rotas anteriores
    if (destinationMarker) {
      map.removeLayer(destinationMarker);
    }
    if (routeLine) {
      map.removeLayer(routeLine);
    }

    // Mostra loading
    document.getElementById("status").textContent = "Identificando local...";
    document.getElementById("status").style.background = "#e3f2fd";
    document.getElementById("status").style.color = "#1976d2";

    // Obtem nome da rua
    const nomeRua = await obterNomeRua(e.latlng.lat, e.latlng.lng);

    // Adiciona marcador de destino
    const destIcon = L.divIcon({
      html: "🎯",
      iconSize: [30, 30],
      className: "destination-marker",
    });

    destinationMarker = L.marker(endPoint, { icon: destIcon }).addTo(map);
    destinationMarker.bindPopup(`🎯 ${nomeRua}`).openPopup();

    // Atualiza input com o nome da rua
    document.getElementById("destino").value = nomeRua;

    // Atualiza status
    document.getElementById("status").textContent = "Local selecionado";
    document.getElementById("status").style.background = "#e8f5e8";
    document.getElementById("status").style.color = "#2e7d32";

    console.log(`📍 Local selecionado: ${nomeRua}`);
  });
}

// Função para calcular viagem
async function calcularViagem() {
  if (!startPoint || !endPoint) {
    alert("📍 Por favor, clique no mapa para escolher um destino!");
    return;
  }

  // Remove rota anterior se existir
  if (routeLine) map.removeLayer(routeLine);

  // Atualiza status
  document.getElementById("status").textContent = "Calculando rota...";
  document.getElementById("status").style.background = "#fff3e0";
  document.getElementById("status").style.color = "#ef6c00";

  // Calcula rota
  const resultado = await calcularRota(startPoint, endPoint);

  // Desenha rota no mapa
  const color = resultado.success ? "#4CAF50" : "#FF9800";
  routeLine = L.polyline(resultado.route, {
    color: color,
    weight: 4,
    opacity: 0.8,
  }).addTo(map);

  map.fitBounds(routeLine.getBounds(), { padding: [20, 20] });

  // Calcula preço
  //const preco = (parseFloat(resultado.distance) * 3.50 + 5.00).toFixed(2);

  let valor = 25;
  const distancia = parseFloat(resultado.distance);

  if (distancia > 5) {
    valor += (distancia - 5) * 3;
  }

  // Verifica os checkboxes (se existirem no HTML)
  const caixa = document.getElementById("caixaTransporte")?.checked;
  const grande = document.getElementById("animalGrande")?.checked;
  const emergencia = document.getElementById("emergencia")?.checked;
  const finalSemana = document.getElementById("finalSemana")?.checked;

  if (emergencia) valor += 10;
  if (finalSemana) valor += 5;

  if (caixa) valor += 5;
  if (grande) valor += 10;

  const preco = valor.toFixed(2);

  // Atualiza informações na tela
  document.getElementById("distancia").textContent = resultado.distance;
  document.getElementById("preco").textContent = preco;
  document.getElementById("status").textContent = "Rota calculada!";
  document.getElementById("status").style.background = "#e8f5e8";
  document.getElementById("status").style.color = "#2e7d32";

  // Mostra seção de confirmação
  document.getElementById("confirmacao").style.display = "block";

  console.log(
    `🚗 Viagem: ${resultado.distance}km - R$${preco} - ${resultado.duration}min`
  );
}

// Função para enviar para WhatsApp
function enviarWhatsApp() {
  if (LOGIN_ATIVO) {
    // Checa se o usuário está logado
    if (localStorage.getItem("loggedIn") !== "true") {
      alert("Você precisa estar logado para solicitar uma corrida!");
      window.location.href = "login.html";
      return;
    }
  }

  // Pega os dados do modal
  const nome = document.getElementById("nomeProprietario").value || "[Seu nome]";
  const telefone = document.getElementById("telefoneProprietario").value || "[Seu telefone]";
  const pet = document.getElementById("petProprietario").value || "[Nome e tipo do pet]";
  const obs = document.getElementById("obsProprietario").value || "[Adicionar se necessário]";

  const destinoNome = document.getElementById("destino").value;
  const distancia = document.getElementById("distancia").textContent;
  const preco = document.getElementById("preco").textContent;

  // Coordenadas
  const origemLat = startPoint[0];
  const origemLng = startPoint[1];
  const destinoLat = endPoint[0];
  const destinoLng = endPoint[1];

  // Links do Google Maps
  const linkOrigem = `https://www.google.com/maps?q=${origemLat},${origemLng}`;
  const linkRota = `https://www.google.com/maps/dir/${origemLat},${origemLng}/${destinoLat},${destinoLng}`;

  // Número do WhatsApp da Pet Ride Express
  const numeroWhatsApp = "5527996338749";

  // Monta a mensagem com links clicáveis
  const mensagem = `🐾 *Pet Ride Express* - Solicitação de Corrida

📍 *Destino:* ${destinoNome}
📏 *Distância:* ${distancia} km
💰 *Valor estimado:* R$ ${preco}
📌 *Localização atual:* [Abrir no mapa](${linkOrigem})
🗺️ *Rota completa:* [Abrir no Google Maps](${linkRota})

🐕 Preciso de transporte para meu pet!

*Dados do proprietário:*
• Nome: ${nome}
• Telefone: ${telefone}
• Pet: ${pet}
• Observações: ${obs}

Aguardo contato! 🚗🐾`;

  // Codifica a mensagem para URL
  const mensagemCodificada = encodeURIComponent(mensagem);

  // Cria o link do WhatsApp
  const linkWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${mensagemCodificada}`;

  // Abre o WhatsApp
  window.open(linkWhatsApp, "_blank");

  // Atualiza status
  document.getElementById("status").textContent = "Enviado para WhatsApp!";
  document.getElementById("status").style.background = "#e8f5e8";
  document.getElementById("status").style.color = "#2e7d32";

  // Esconde confirmação
  document.getElementById("confirmacao").style.display = "none";

  console.log("📱 Solicitação enviada para WhatsApp com links!");
}

// Função para cancelar
function cancelarSolicitacao() {
  document.getElementById("confirmacao").style.display = "none";
  document.getElementById("status").textContent = "Solicitação cancelada";
  document.getElementById("status").style.background = "#ffebee";
  document.getElementById("status").style.color = "#c62828";
}

// Tratamento global de erros
window.addEventListener("error", function (event) {
  console.log("Erro capturado:", event.error);
});

window.addEventListener("unhandledrejection", function (event) {
  console.log("Promise rejeitada:", event.reason);
  event.preventDefault(); // Previne que apareça no console como erro
});

const LOGIN_ATIVO = false;

// Inicialização quando a página carregar
document.addEventListener("DOMContentLoaded", function () {
  initMap();
  setupMapClick();

  // Configura botão de calcular viagem
  const btnSimular = document.getElementById("btnSimular");
  if (btnSimular) {
    btnSimular.addEventListener("click", calcularViagem);
  }

    // Atualiza preço ao marcar/desmarcar adicionais
  const adicionais = [
    "caixaTransporte",
    "animalGrande",
    "finalSemana",
    "emergencia"
  ];
  adicionais.forEach(id => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.addEventListener("change", function () {
        // Só recalcula se a confirmação estiver visível
        if (document.getElementById("confirmacao").style.display === "block") {
          calcularViagem();
        }
      });
    }
  });


  // Configura botões de confirmação
  const btnConfirmar = document.getElementById("btnConfirmar");
  if (btnConfirmar) {
    btnConfirmar.addEventListener("click", function () {
      if (LOGIN_ATIVO) {
        // Checa se está logado
        if (localStorage.getItem("loggedIn") !== "true") {
          alert("Você precisa estar logado para solicitar uma corrida!");
          window.location.href = "login.html";
          return;
        }
      }
      document.getElementById("modalProprietario").style.display = "block";
    });
  }

  // Botão de fechar modal
  const btnFecharModal = document.getElementById("btnFecharModal");
  if (btnFecharModal) {
    btnFecharModal.addEventListener("click", function() {
      document.getElementById("modalProprietario").style.display = "none";
    });
  }

  // Botão de envio final do WhatsApp
  const btnEnviarWhatsAppFinal = document.getElementById("btnEnviarWhatsAppFinal");
  if (btnEnviarWhatsAppFinal) {
    btnEnviarWhatsAppFinal.addEventListener("click", enviarWhatsApp);
  }

  const btnCancelar = document.getElementById("btnCancelar");
  if (btnCancelar) {
    btnCancelar.addEventListener("click", cancelarSolicitacao);
  }
});
