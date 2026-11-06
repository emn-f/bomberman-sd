package clientbridge;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import shared.*;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.rmi.Naming;
import java.util.concurrent.Executors;

public class ClientBridgeMain {

    private static final Gson gson = new Gson();
    private static IBombermanService bombermanService;
    private static String rmiUri;

    private static synchronized IBombermanService getService() throws Exception {
        if (bombermanService == null) {
            bombermanService = (IBombermanService) Naming.lookup(rmiUri);
        }
        return bombermanService;
    }

    private static synchronized IBombermanService refreshService() throws Exception {
        System.out.println("[Lookup] Reconectando ao servidor RMI em " + rmiUri + "...");
        bombermanService = (IBombermanService) Naming.lookup(rmiUri);
        return bombermanService;
    }

    public static void main(String[] args) {
        String rmiHost = System.getenv().getOrDefault("RMI_HOST", "localhost");
        int rmiPort = 1099;
        int httpPort = 8081;

        // Parse CLI args if present: -rmiHost, -rmiPort, -httpPort or positional [httpPort] [rmiPort] [rmiHost]
        for (int i = 0; i < args.length; i++) {
            if ("-rmiHost".equalsIgnoreCase(args[i]) && i + 1 < args.length) {
                rmiHost = args[++i];
            } else if ("-rmiPort".equalsIgnoreCase(args[i]) && i + 1 < args.length) {
                rmiPort = Integer.parseInt(args[++i]);
            } else if ("-httpPort".equalsIgnoreCase(args[i]) && i + 1 < args.length) {
                httpPort = Integer.parseInt(args[++i]);
            } else if (i == 0 && !args[i].startsWith("-")) {
                httpPort = Integer.parseInt(args[0]);
            } else if (i == 1 && !args[i].startsWith("-")) {
                rmiPort = Integer.parseInt(args[1]);
            } else if (i == 2 && !args[i].startsWith("-")) {
                rmiHost = args[2];
            }
        }

        String envRmiPort = System.getenv("RMI_PORT");
        if (envRmiPort != null && !envRmiPort.isBlank()) {
            rmiPort = Integer.parseInt(envRmiPort.trim());
        }
        String envHttpPort = System.getenv("HTTP_PORT");
        if (envHttpPort != null && !envHttpPort.isBlank()) {
            httpPort = Integer.parseInt(envHttpPort.trim());
        }

        System.out.println("==================================================");
        System.out.println("   BOMBERMAN LOCAL HTTP BRIDGE (JRMP -> REST)     ");
        System.out.println("==================================================");
        System.out.println("RMI Target: rmi://" + rmiHost + ":" + rmiPort + "/BombermanService");
        System.out.println("Local HTTP Bridge Port: " + httpPort);

        try {
            // Lookup RMI Remote Stub
            rmiUri = "rmi://" + rmiHost + ":" + rmiPort + "/BombermanService";
            System.out.println("[Lookup] Conectando ao servidor RMI em " + rmiUri + "...");
            bombermanService = (IBombermanService) Naming.lookup(rmiUri);
            System.out.println("[Lookup] Stub remoto obtido com sucesso!");

            // Create local HTTP Server
            HttpServer server = HttpServer.create(new InetSocketAddress("0.0.0.0", httpPort), 0);
            server.setExecutor(Executors.newCachedThreadPool());

            // Register handlers
            server.createContext("/api/connect", new ConnectHandler());
            server.createContext("/api/move", new MoveHandler());
            server.createContext("/api/bomb", new BombHandler());
            server.createContext("/api/confirm", new ConfirmHandler());
            server.createContext("/api/state", new StateHandler());
            server.createContext("/api/disconnect", new DisconnectHandler());
            server.createContext("/api/restart", new RestartHandler());

            server.start();
            System.out.println("[Bridge HTTP] Servidor HTTP ativo em todas as interfaces na porta " + httpPort + ". Use o IP desta máquina para conexões na rede.");
            System.out.println("[Endpoints]");
            System.out.println("  POST /api/connect    -> Conectar jogador");
            System.out.println("  POST /api/move       -> Mover jogador (UP, DOWN, LEFT, RIGHT)");
            System.out.println("  POST /api/bomb       -> Plantar bomba");
            System.out.println("  POST /api/confirm    -> Confirmar turno e detonar");
            System.out.println("  GET  /api/state      -> Obter estado completo");
            System.out.println("  POST /api/disconnect -> Desconectar jogador");
            System.out.println("  POST /api/restart    -> Reiniciar partida / revanche");
            System.out.println("[Aviso] Pressione Ctrl+C para encerrar o bridge.");
            System.out.println("==================================================");

            // Keep bridge alive indefinitely
            Thread.currentThread().join();

        } catch (InterruptedException e) {
            System.out.println("[Bridge] Encerrado pelo usuário.");
        } catch (Exception e) {
            System.err.println("[ERRO CRÍTICO] Falha ao iniciar Client Bridge: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }

    private static void applyCors(HttpExchange exchange) {
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }

    private static boolean handlePreflight(HttpExchange exchange) throws IOException {
        applyCors(exchange);
        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            exchange.sendResponseHeaders(204, -1);
            exchange.close();
            return true;
        }
        return false;
    }

    private static void sendJsonResponse(HttpExchange exchange, int statusCode, Object body) throws IOException {
        applyCors(exchange);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        String json = gson.toJson(body);
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private static void sendErrorResponse(HttpExchange exchange, int statusCode, String message) throws IOException {
        JsonObject errorObj = new JsonObject();
        errorObj.addProperty("error", message);
        sendJsonResponse(exchange, statusCode, errorObj);
    }

    private static String readRequestBody(HttpExchange exchange) throws IOException {
        try (InputStream is = exchange.getRequestBody()) {
            return new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    // --- HANDLERS ---

    static class ConnectHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handlePreflight(exchange)) return;
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendErrorResponse(exchange, 405, "Método não permitido. Utilize POST.");
                return;
            }

            try {
                String body = readRequestBody(exchange);
                JsonObject json = gson.fromJson(body, JsonObject.class);
                String nome = (json != null && json.has("nome")) ? json.get("nome").getAsString() : "Jogador";

                try {
                    PlayerDTO player = getService().conectarJogador(nome);
                    sendJsonResponse(exchange, 200, player);
                } catch (java.rmi.RemoteException re) {
                    PlayerDTO player = refreshService().conectarJogador(nome);
                    sendJsonResponse(exchange, 200, player);
                }
            } catch (GameFullException e) {
                sendErrorResponse(exchange, 409, e.getMessage());
            } catch (Exception e) {
                sendErrorResponse(exchange, 500, "Erro interno: " + e.getMessage());
            }
        }
    }

    static class MoveHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handlePreflight(exchange)) return;
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendErrorResponse(exchange, 405, "Método não permitido. Utilize POST.");
                return;
            }

            try {
                String body = readRequestBody(exchange);
                JsonObject json = gson.fromJson(body, JsonObject.class);
                if (json == null || !json.has("playerId") || !json.has("direcao")) {
                    sendErrorResponse(exchange, 400, "Campos 'playerId' e 'direcao' são obrigatórios.");
                    return;
                }

                String playerId = json.get("playerId").getAsString();
                String dirStr = json.get("direcao").getAsString().toUpperCase();
                DirectionEnum direcao = DirectionEnum.valueOf(dirStr);

                GameStateDTO state = bombermanService.mover(playerId, direcao);
                sendJsonResponse(exchange, 200, state);
            } catch (IllegalArgumentException e) {
                sendErrorResponse(exchange, 400, "Direção inválida. Use UP, DOWN, LEFT ou RIGHT.");
            } catch (GameNotStartedException | InvalidTurnException | NoMovementLeftException | CollisionException e) {
                sendErrorResponse(exchange, 400, e.getMessage());
            } catch (Exception e) {
                sendErrorResponse(exchange, 500, "Erro interno: " + e.getMessage());
            }
        }
    }

    static class BombHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handlePreflight(exchange)) return;
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendErrorResponse(exchange, 405, "Método não permitido. Utilize POST.");
                return;
            }

            try {
                String body = readRequestBody(exchange);
                JsonObject json = gson.fromJson(body, JsonObject.class);
                if (json == null || !json.has("playerId")) {
                    sendErrorResponse(exchange, 400, "Campo 'playerId' é obrigatório.");
                    return;
                }

                String playerId = json.get("playerId").getAsString();
                GameStateDTO state = bombermanService.plantarBomba(playerId);
                sendJsonResponse(exchange, 200, state);
            } catch (GameNotStartedException | InvalidTurnException | InsufficientApException e) {
                sendErrorResponse(exchange, 400, e.getMessage());
            } catch (Exception e) {
                sendErrorResponse(exchange, 500, "Erro interno: " + e.getMessage());
            }
        }
    }

    static class ConfirmHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handlePreflight(exchange)) return;
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendErrorResponse(exchange, 405, "Método não permitido. Utilize POST.");
                return;
            }

            try {
                String body = readRequestBody(exchange);
                JsonObject json = gson.fromJson(body, JsonObject.class);
                if (json == null || !json.has("playerId")) {
                    sendErrorResponse(exchange, 400, "Campo 'playerId' é obrigatório.");
                    return;
                }

                String playerId = json.get("playerId").getAsString();
                GameStateDTO state = bombermanService.confirmarTurno(playerId);
                sendJsonResponse(exchange, 200, state);
            } catch (GameNotStartedException | InvalidTurnException e) {
                sendErrorResponse(exchange, 400, e.getMessage());
            } catch (Exception e) {
                sendErrorResponse(exchange, 500, "Erro interno: " + e.getMessage());
            }
        }
    }

    static class StateHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handlePreflight(exchange)) return;
            if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendErrorResponse(exchange, 405, "Método não permitido. Utilize GET.");
                return;
            }

            try {
                try {
                    GameStateDTO state = getService().obterEstadoJogo();
                    sendJsonResponse(exchange, 200, state);
                } catch (java.rmi.RemoteException re) {
                    GameStateDTO state = refreshService().obterEstadoJogo();
                    sendJsonResponse(exchange, 200, state);
                }
            } catch (Exception e) {
                sendErrorResponse(exchange, 500, "Erro interno ao obter estado: " + e.getMessage());
            }
        }
    }

    static class DisconnectHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handlePreflight(exchange)) return;
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendErrorResponse(exchange, 405, "Método não permitido. Utilize POST.");
                return;
            }

            try {
                String body = readRequestBody(exchange);
                JsonObject json = gson.fromJson(body, JsonObject.class);
                if (json != null && json.has("playerId")) {
                    String playerId = json.get("playerId").getAsString();
                    bombermanService.desconectarJogador(playerId);
                }
                JsonObject res = new JsonObject();
                res.addProperty("status", "disconnected");
                sendJsonResponse(exchange, 200, res);
            } catch (Exception e) {
                sendErrorResponse(exchange, 500, "Erro ao desconectar: " + e.getMessage());
            }
        }
    }

    static class RestartHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handlePreflight(exchange)) return;
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendErrorResponse(exchange, 405, "Método não permitido. Utilize POST.");
                return;
            }

            try {
                try {
                    GameStateDTO state = getService().reiniciarPartida();
                    sendJsonResponse(exchange, 200, state);
                } catch (java.rmi.RemoteException re) {
                    GameStateDTO state = refreshService().reiniciarPartida();
                    sendJsonResponse(exchange, 200, state);
                }
            } catch (Exception e) {
                sendErrorResponse(exchange, 500, "Erro ao reiniciar partida: " + e.getMessage());
            }
        }
    }
}
