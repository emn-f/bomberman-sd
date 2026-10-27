package server;

import shared.IBombermanService;

import java.rmi.registry.LocateRegistry;
import java.rmi.registry.Registry;

public class ServerMain {
    public static final String SERVICE_NAME = "BombermanService";
    public static final int DEFAULT_RMI_PORT = 1099;

    public static void main(String[] args) {
        int port = DEFAULT_RMI_PORT;
        if (args.length > 0) {
            try {
                port = Integer.parseInt(args[0]);
            } catch (NumberFormatException e) {
                System.err.println("Porta RMI inválida informada (" + args[0] + "). Usando porta padrão " + DEFAULT_RMI_PORT);
            }
        }

        try {
            System.out.println("==================================================");
            System.out.println("   BOMBERMAN MULTIPLAYER RMI SERVER - INICIANDO   ");
            System.out.println("==================================================");

            // Create or get local RMI Registry
            Registry registry;
            try {
                registry = LocateRegistry.createRegistry(port);
                System.out.println("[RMI Registry] Criado com sucesso na porta " + port);
            } catch (Exception e) {
                registry = LocateRegistry.getRegistry(port);
                System.out.println("[RMI Registry] Conectado ao Registry existente na porta " + port);
            }

            // Instantiate service
            IBombermanService service = new BombermanServiceImpl();

            // Rebind service
            registry.rebind(SERVICE_NAME, service);
            System.out.println("[RMI Service] Servidor registrado com o nome: '" + SERVICE_NAME + "'");
            System.out.println("[Status] Servidor pronto para aceitar conexões de jogadores.");
            System.out.println("[Aviso] Pressione Ctrl+C para encerrar o servidor.");
            System.out.println("==================================================");

            // Keep server alive indefinitely
            Thread.currentThread().join();

        } catch (InterruptedException e) {
            System.out.println("[Servidor] Encerrado pelo usuário.");
        } catch (Exception e) {
            System.err.println("[ERRO CRÍTICO] Falha ao iniciar Servidor RMI: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }
}
