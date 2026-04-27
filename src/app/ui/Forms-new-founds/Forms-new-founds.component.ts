import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HeaderComponent } from '../../component/header/header.component';
import { FooterComponent } from '../../component/footer/footer.component';
import { FoundsService } from '../../Services/founds.service';
import { Fundo } from '../../interfaces/fundos.interface';

export interface TipoFundo {
  codigo: number;
  nome: string;
  descricao: string;
}

@Component({
  selector: 'app-Forms-new-founds',
  templateUrl: './Forms-new-founds.component.html',
  styleUrls: ['./Forms-new-founds.component.css'],
  standalone: true,
    imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    HeaderComponent,
    FooterComponent
    ]
})
export class FormsNewFoundsComponent implements OnInit {
 
  fundoForm: FormGroup;
  loading = false;
  tiposFundo: TipoFundo[] = [];


  constructor(
    private snackBar: MatSnackBar,
    private fb: FormBuilder,
    private foundsService: FoundsService,
    private router: Router

  ) { 
        this.fundoForm = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(3)]],
      cnpj: ['', [Validators.required, Validators.pattern(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/)]],
      codigo_tipo: ['', Validators.required],
      patrimonio: ['', [Validators.required, Validators.min(0.01)]]
    });
  }

  

  ngOnInit() {
  }

  carregarTiposFundo() {
    this.foundsService.getFounds().subscribe({  // fazer lista dos codigos de investimento
      next: (fundos) => {
        console.log(fundos);
      },
      error: (error) => {
        console.error('Erro ao carregar tipos:', error);
        this.snackBar.open('Erro ao carregar tipos de fundo', 'Fechar', { duration: 3000 });
      }
    });
  }

onSubmit() {
  if (this.fundoForm.invalid) {
    this.snackBar.open('Preencha todos os campos corretamente', 'Fechar', { duration: 3000 });
    return;
  }

  this.loading = true;

  const codigoGerado = this.generateCode();
  const cnpjLimpo = this.fundoForm.value.cnpj.replace(/\D/g, '');
  
  const currentData: Fundo[] = Array.isArray(this.foundsService.foundListServer)
    ? this.foundsService.foundListServer
    : [];
  
  const codigoExistente = currentData.some(fundo => fundo.codigo === codigoGerado);
  if (codigoExistente) {
    this.snackBar.open(`Código ${codigoGerado} já existe!`, 'Fechar', { duration: 4000 });
    this.loading = false;
    return;
  }
 
  //validação cnpj
  const cnpjExistente = currentData.some(fundo => 
    fundo.cnpj.replace(/\D/g, '') === cnpjLimpo
  );
  
  if (cnpjExistente) {
    this.snackBar.open(`CNPJ ${this.fundoForm.value.cnpj} já cadastrado!`, 'Fechar', { duration: 4000 });
    this.loading = false;
    return;
  }

  const fundoData: Fundo = {
    codigo: codigoGerado, 
    nome: this.fundoForm.value.nome.trim(),
    cnpj: this.fundoForm.value.cnpj.trim(),
    codigo_tipo: String(this.fundoForm.value.codigo_tipo).trim(),
    patrimonio: Number(this.fundoForm.value.patrimonio)
  };

  this.foundsService.foundListServer = [fundoData, ...currentData];
  this.loading = false;

  this.snackBar.open(`Fundo ${fundoData.codigo} salvo com sucesso!`, 'Fechar', { duration: 3000 });
  this.router.navigate(['/found-list']);
}

private generateCode(): string {
  const currentData: Fundo[] = Array.isArray(this.foundsService.foundListServer)
    ? this.foundsService.foundListServer
    : [];
  
  if (currentData.length === 0) {
    return 'FND001';
  }
  
  const numbers = currentData
    .map(fundo => {
      const match = fundo.codigo.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    })
    .filter(num => !isNaN(num));
  
  const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
  const nextNumber = maxNumber + 1;
  const paddedNumber = nextNumber.toString().padStart(3, '0');
  
  return `FND${paddedNumber}`;
}

  cancelar() {
    this.router.navigate(['found-list']);
  }

  AddFounds(fundo: Fundo, code: number) {  // inserir no component da proxima pagina
      this.foundsService.PostFounds(fundo).subscribe({
        next: (response) => {
          console.log('Sucesso:', response);
          this.snackBar.open('Fundo criado com sucesso!', 'Fechar', { duration: 3000 });
          setTimeout(() => this.router.navigate(['/found-list']), 2000);
        },
        error: (error) => {
          console.error('Erro:', error);
          this.snackBar.open(error.error?.error || 'Erro ao criar fundo', 'Fechar', { duration: 5000 });
        }
      });
  
      // this.dialog.open(DialogAdicionarFundoComponent);
  }
  
}
